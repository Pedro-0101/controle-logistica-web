import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import Hls from 'hls.js';
import { AnprService } from '@/shared/services/anpr.service';
import { CameraStream } from './camera-stream';

const players = vi.hoisted(() => [] as Array<{
  loadSource: ReturnType<typeof vi.fn>;
  attachMedia: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  handlers: Map<string, () => void>;
}>);

vi.mock('hls.js', () => ({
  default: class {
    static isSupported = () => true;
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' };
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    handlers = new Map<string, () => void>();
    constructor() { players.push(this); }
    on(event: string, callback: () => void) { this.handlers.set(event, callback); }
  },
}));

describe('CameraStream video only', () => {
  const recognizeImage = vi.fn();

  beforeEach(() => {
    players.length = 0;
    recognizeImage.mockClear();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    TestBed.configureTestingModule({
      imports: [CameraStream],
      providers: [{ provide: AnprService, useValue: { recognizeImage } }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createPlayer() {
    const fixture = TestBed.createComponent(CameraStream);
    fixture.componentRef.setInput('src', '/camera-1/index.m3u8');
    fixture.componentRef.setInput('title', 'Entrada');
    fixture.detectChanges();
    return fixture;
  }

  it('reproduz o vídeo sem canvas, upload de imagens ou ciclos de OCR', async () => {
    const fixture = createPlayer();
    const player = players[0];
    expect(player.loadSource).toHaveBeenCalledWith('/camera-1/index.m3u8');
    vi.useFakeTimers();
    player.handlers.get(Hls.Events.MANIFEST_PARSED)!();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(5000);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('video')?.getAttribute('aria-label')).toBe('Entrada');
    expect(element.querySelector('canvas')).toBeNull();
    expect(element.textContent).toContain('AO VIVO');
    expect(element.textContent).not.toContain('Reconhecendo placa');
    expect(recognizeImage).not.toHaveBeenCalled();
  });

  it('encerra o stream anterior ao trocar a câmera e ao destruir o player', () => {
    const fixture = createPlayer();
    const oldPlayer = players[0];
    fixture.componentRef.setInput('src', '/camera-2/index.m3u8');
    fixture.detectChanges();
    expect(oldPlayer.destroy).toHaveBeenCalledOnce();
    const newPlayer = players[1];
    expect(newPlayer.loadSource).toHaveBeenCalledWith('/camera-2/index.m3u8');
    fixture.destroy();
    expect(newPlayer.destroy).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
  });

  it('oferece reprodução manual quando o navegador bloqueia autoplay', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Autoplay blocked'));
    const fixture = createPlayer();
    players[0].handlers.get(Hls.Events.MANIFEST_PARSED)!();
    await Promise.resolve();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Reproduzir vídeo"]');
    expect(button).not.toBeNull();
    button!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AO VIVO');
  });
});
