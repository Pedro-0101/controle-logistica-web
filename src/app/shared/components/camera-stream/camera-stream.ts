import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import Hls from 'hls.js';
import { NgIcon } from '@ng-icons/core';
import { TimeoutError, catchError, firstValueFrom, of, timeout } from 'rxjs';

import type { AnprRecognition, ApiError, PlateBox } from '@/shared/models';
import { AnprService } from '@/shared/services/anpr.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import {
  drawPlateOverlay,
  mapPlateBox,
  type ObjectFit,
} from './plate-overlay';

type StreamStatus = 'loading' | 'playing' | 'error';

const ANPR_INTERVAL_MS = 700;
const CAPTURE_MAX_DIM = 960;
const CAPTURE_QUALITY = 0.7;
const REQUEST_TIMEOUT_MS = 10_000;
const PLATE_HOLD_MS = 1500;

interface DetectedPlate {
  box: PlateBox;
  placa: string;
  at: number;
}

@Component({
  selector: 'gp-camera-stream',
  imports: [ZardButtonComponent, LoadingSpinner, NgIcon],
  templateUrl: './camera-stream.html',
  styleUrl: './camera-stream.scss',
})
export class CameraStream implements OnDestroy {
  readonly src = input.required<string>();
  readonly title = input.required<string>();
  /** Habilita o reconhecimento de placas (ANPR) com overlay em tempo real. */
  readonly anpr = input(false);
  /** Intervalo (ms) entre capturas de frame enviadas ao ANPR. */
  readonly anprIntervalMs = input(ANPR_INTERVAL_MS);
  /** Ajuste do vídeo no contêiner, usado para mapear o `box` corretamente. */
  readonly objectFit = input<ObjectFit>('contain');

  protected readonly status = signal<StreamStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly autoplayBlocked = signal(false);
  protected readonly anprError = signal<string | null>(null);

  protected readonly isLive = computed(() => this.status() === 'playing');
  protected readonly plateAnnouncement = computed(() => {
    const plate = this.plate();
    return plate ? `Placa ${plate.placa} detectada.` : '';
  });

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly overlayRef = viewChild<ElementRef<HTMLCanvasElement>>('overlay');

  private readonly anprService = inject(AnprService);
  private readonly logger = inject(LoggerService).create('CameraStream');

  private readonly plate = signal<DetectedPlate | null>(null);

  private hls?: Hls;
  private captureCanvas?: HTMLCanvasElement;
  private captureScale = 1;
  private anprTimer?: ReturnType<typeof setTimeout>;
  private anprInFlight = false;
  private destroyed = false;
  private resizeObserver?: ResizeObserver;

  constructor() {
    afterNextRender(() => this.setup());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.anprTimer) {
      clearTimeout(this.anprTimer);
      this.anprTimer = undefined;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.hls?.destroy();
    this.hls = undefined;
  }

  protected play(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) {
      return;
    }
    video.muted = true;
    void video
      .play()
      .then(() => {
        this.status.set('playing');
        this.autoplayBlocked.set(false);
        this.logger.info('Vídeo em reprodução', {
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          crossOrigin: video.crossOrigin,
        });
        this.ensureAnpr();
      })
      .catch(() => this.autoplayBlocked.set(true));
  }

  protected retry(): void {
    this.hls?.destroy();
    this.hls = undefined;
    this.status.set('loading');
    this.errorMessage.set('');
    this.autoplayBlocked.set(false);
    this.anprError.set(null);
    this.plate.set(null);
    this.setup();
  }

  private setup(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) {
      this.status.set('error');
      this.errorMessage.set('Não foi possível inicializar o player.');
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    const src = this.src();

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      this.hls = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.play();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          this.fail('Falha ao reproduzir o stream da câmera.');
        }
      });
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener(
        'loadedmetadata',
        () => {
          this.play();
        },
        { once: true },
      );
      video.addEventListener(
        'error',
        () => this.fail('Falha ao reproduzir o stream da câmera.'),
        { once: true },
      );
      return;
    }

    this.fail('Este navegador não suporta HLS.');
  }

  private fail(message: string): void {
    this.status.set('error');
    this.errorMessage.set(message);
  }

  private ensureAnpr(): void {
    if (!this.anpr() || this.destroyed) {
      return;
    }
    this.setupResizeObserver();
    if (!this.anprTimer) {
      this.scheduleAnpr();
    }
  }

  private setupResizeObserver(): void {
    if (this.resizeObserver || typeof ResizeObserver === 'undefined') {
      return;
    }
    const container = this.overlayRef()?.nativeElement.parentElement;
    if (!container) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => this.drawOverlay());
    this.resizeObserver.observe(container);
  }

  private scheduleAnpr(): void {
    if (this.destroyed || !this.anpr()) {
      return;
    }
    this.anprTimer = setTimeout(() => void this.runAnprCycle(), this.anprIntervalMs());
  }

  private async runAnprCycle(): Promise<void> {
    this.anprTimer = undefined;
    if (this.destroyed || !this.anpr() || this.anprInFlight) {
      this.scheduleAnpr();
      return;
    }

    const video = this.videoRef()?.nativeElement;
    if (!video || this.status() !== 'playing' || !video.videoWidth || !video.videoHeight) {
      this.scheduleAnpr();
      return;
    }

    this.anprInFlight = true;
    try {
      const base64 = this.captureFrame(video);
      if (!base64) {
        return;
      }
      const result = await firstValueFrom(
        this.anprService.recognizeImage(base64).pipe(
          timeout({ each: REQUEST_TIMEOUT_MS }),
          catchError((error: unknown) => {
            this.handleRecognitionError(error);
            return of(undefined);
          }),
        ),
      );
      if (result) {
        this.handleRecognition(result);
      }
    } finally {
      this.anprInFlight = false;
      this.scheduleAnpr();
    }
  }

  private captureFrame(video: HTMLVideoElement): string | null {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      return null;
    }

    this.captureScale = Math.min(1, CAPTURE_MAX_DIM / width, CAPTURE_MAX_DIM / height);
    const captureWidth = Math.round(width * this.captureScale);
    const captureHeight = Math.round(height * this.captureScale);

    if (!this.captureCanvas) {
      this.captureCanvas = document.createElement('canvas');
    }
    this.captureCanvas.width = captureWidth;
    this.captureCanvas.height = captureHeight;

    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) {
      this.logger.error('Não foi possível obter o contexto 2D do canvas de captura.');
      this.anprError.set('Falha ao capturar frame');
      return null;
    }

    try {
      ctx.drawImage(video, 0, 0, captureWidth, captureHeight);
      const dataUrl = this.captureCanvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      this.logger.debug('Frame capturado do vídeo', {
        videoWidth: width,
        videoHeight: height,
        captureWidth,
        captureHeight,
        base64Length: base64.length,
      });
      return base64;
    } catch (error) {
      this.logger.error('Falha ao capturar frame (provável bloqueio CORS no stream)', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        videoSrc: video.currentSrc,
      });
      this.anprError.set('Falha ao capturar frame (CORS?)');
      return null;
    }
  }

  private handleRecognition(result: AnprRecognition): void {
    if (result.box && result.box.length === 4) {
      const s = this.captureScale;
      const box: PlateBox = [result.box[0] / s, result.box[1] / s, result.box[2] / s, result.box[3] / s];
      this.anprError.set(null);
      this.plate.set({ box, placa: result.placa, at: Date.now() });
      this.logger.info('Placa reconhecida', {
        placa: result.placa,
        confianca: result.confianca,
        box,
      });
      this.drawOverlay();
      return;
    }
    this.anprError.set(null);
    this.logger.debug('Frame sem placa (box ausente)', { placa: result.placa });
    this.clearPlateIfStale();
  }

  private handleRecognitionError(error: unknown): void {
    if (error instanceof TimeoutError) {
      this.logger.warn('Tempo esgotado ao consultar o ANPR');
      this.anprError.set('ANPR não respondeu');
    } else {
      const apiError = error as Partial<ApiError>;
      this.logger.warn('Erro ao consultar o ANPR', {
        status: apiError.status,
        kind: apiError.kind,
        message: apiError.message,
      });
      if (apiError.status === 422) {
        this.anprError.set(null);
      } else {
        this.anprError.set(this.describeApiError(apiError));
      }
    }
    this.clearPlateIfStale();
  }

  private describeApiError(error: Partial<ApiError>): string {
    if (error.kind === 'NETWORK' || error.status === 0) {
      return 'API indisponível';
    }
    if (error.status === 401) {
      return 'Sessão expirada';
    }
    if (error.status === 502 || error.status === 503) {
      return 'Serviço de OCR indisponível';
    }
    if (error.status === 504) {
      return 'OCR demorou demais';
    }
    return `Erro no reconhecimento (${error.status ?? '?'})`;
  }

  /** Remove o contorno quando não há placa, mantendo-o por alguns instantes. */
  private clearPlateIfStale(): void {
    const current = this.plate();
    if (!current) {
      return;
    }
    if (Date.now() - current.at >= PLATE_HOLD_MS) {
      this.plate.set(null);
      this.drawOverlay();
    }
  }

  private drawOverlay(): void {
    const canvas = this.overlayRef()?.nativeElement;
    if (!canvas) {
      return;
    }
    const container = canvas.parentElement;
    if (!container) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const video = this.videoRef()?.nativeElement;
    const current = this.plate();
    if (!current || !video || !video.videoWidth || !video.videoHeight || !width || !height) {
      return;
    }

    const rect = mapPlateBox(
      current.box,
      video.videoWidth,
      video.videoHeight,
      width,
      height,
      this.objectFit(),
    );
    drawPlateOverlay(ctx, rect, current.placa, width, height);
  }
}
