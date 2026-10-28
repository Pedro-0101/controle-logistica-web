import {
  afterNextRender,
  Component,
  computed,
  effect,
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
  readonly objectFit = input<'contain' | 'cover'>('contain');

  protected readonly status = signal<StreamStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly autoplayBlocked = signal(false);

  protected readonly isLive = computed(() => this.status() === 'playing');

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private hls?: Hls;
  private destroyed = false;
  private nativeListeners?: AbortController;
  private generation = 0;

  constructor() {
    afterNextRender(() => this.setup());
    let initial = true;
    effect(() => {
      this.src();
      if (!initial) {
        this.retry();
      }
      initial = false;
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.releaseStream();
  }

  private releaseStream(): void {
    this.generation++;
    this.nativeListeners?.abort();
    this.nativeListeners = undefined;
    this.hls?.destroy();
    this.hls = undefined;
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }

  protected play(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video || this.destroyed) {
      return;
    }
    const generation = this.generation;
    video.muted = true;
    void video
      .play()
      .then(() => {
        if (this.destroyed || generation !== this.generation) return;
        this.status.set('playing');
        this.autoplayBlocked.set(false);
      })
      .catch(() => {
        if (!this.destroyed && generation === this.generation) this.autoplayBlocked.set(true);
      });
  }

  protected retry(): void {
    if (this.destroyed) return;
    this.releaseStream();
    this.status.set('loading');
    this.errorMessage.set('');
    this.autoplayBlocked.set(false);
    this.setup();
  }

  private setup(): void {
    if (this.destroyed) return;
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
        liveSyncDuration: 3,
        maxBufferLength: 30,
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
      this.nativeListeners = new AbortController();
      const signal = this.nativeListeners.signal;
      video.src = src;
      video.addEventListener(
        'loadedmetadata',
        () => {
          this.play();
        },
        { once: true, signal },
      );
      video.addEventListener(
        'error',
        () => this.fail('Falha ao reproduzir o stream da câmera.'),
        { once: true, signal },
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
