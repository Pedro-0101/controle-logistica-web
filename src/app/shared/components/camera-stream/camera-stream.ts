import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import Hls from 'hls.js';

import { ZardButtonComponent } from '@/shared/components/button';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';

type StreamStatus = 'loading' | 'playing' | 'error';

@Component({
  selector: 'gp-camera-stream',
  imports: [ZardButtonComponent, LoadingSpinner],
  templateUrl: './camera-stream.html',
  styleUrl: './camera-stream.scss',
})
export class CameraStream implements OnDestroy {
  readonly src = input.required<string>();
  readonly title = input.required<string>();

  protected readonly status = signal<StreamStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly autoplayBlocked = signal(false);

  protected readonly isLive = computed(() => this.status() === 'playing');

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private hls?: Hls;

  constructor() {
    afterNextRender(() => this.setup());
  }

  ngOnDestroy(): void {
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
      })
      .catch(() => this.autoplayBlocked.set(true));
  }

  protected retry(): void {
    this.hls?.destroy();
    this.hls = undefined;
    this.status.set('loading');
    this.errorMessage.set('');
    this.autoplayBlocked.set(false);
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
}
