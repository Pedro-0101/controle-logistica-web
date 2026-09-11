import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { NgIcon } from '@ng-icons/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { CameraStream } from '@/shared/components/camera-stream';
import { ZardButtonComponent } from '@/shared/components/button';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '@/shared/components/empty-state/empty-state';
import { CameraService } from '@/shared/services/camera.service';
import { LocalStorageService } from '@/shared/services/local-storage.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { Camera } from '@/shared/models';

const SELECTED_CAMERAS_KEY = 'selected-cameras';

@Component({
  selector: 'app-home',
  imports: [SiteHeader, CameraStream, ZardButtonComponent, NgIcon, LoadingSpinner, EmptyState],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Monitoramento de câmeras</h1>
        <p class="text-sm text-muted-foreground">
          Visualização em tempo real dos pontos de entrada e saída.
        </p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <gp-loading-spinner message="Carregando câmeras..." />
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center gap-3 py-12">
          <p class="text-sm text-destructive">{{ error() }}</p>
          <button z-button zType="outline" zSize="sm" (click)="loadCameras()">
            Tentar novamente
          </button>
        </div>
      } @else if (cameras().length === 0) {
        <gp-empty-state
          icon="lucideCamera"
          title="Nenhuma câmera encontrada"
          description="Cadastre câmeras para visualizar o monitoramento em tempo real."
        />
      } @else {
        <section class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2" role="tablist" aria-label="Selecionar câmeras">
            @for (camera of cameras(); track camera.id) {
              <button
                z-button
                [zType]="isSelected(camera.id) ? 'default' : 'outline'"
                zSize="sm"
                role="tab"
                [attr.aria-selected]="isSelected(camera.id)"
                [attr.aria-controls]="'panel-' + camera.id"
                (click)="toggleCamera(camera.id)"
              >
                <ng-icon name="lucideCamera" class="mr-1.5 size-3.5" aria-hidden="true" />
                {{ camera.name }}
              </button>
            }
          </div>

          @if (selectedCameras().length === 0) {
            <div class="flex items-center justify-center py-8">
              <p class="text-sm text-muted-foreground">
                Selecione uma câmera acima para visualizar o stream.
              </p>
            </div>
          } @else {
            <section class="grid gap-6 lg:grid-cols-2" role="tabpanel">
              @for (camera of selectedCameras(); track camera.id) {
                @if (camera.streamUrls?.hlsUrl) {
                  <gp-camera-stream
                    [src]="camera.streamUrls.hlsUrl"
                    [title]="camera.name"
                    [anpr]="true"
                  />
                } @else {
                  <div
                    class="flex aspect-video items-center justify-center rounded-md border border-border bg-muted/50"
                    [attr.aria-label]="'Câmera ' + camera.name + ' sem stream disponível'"
                  >
                    <p class="text-sm text-muted-foreground">Stream não disponível</p>
                  </div>
                }
              }
            </section>
          }
        </section>
      }
    </main>
  `,
})
export class Home implements OnInit {
  private readonly cameraService = inject(CameraService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly logger = inject(LoggerService).create('Home');

  protected readonly cameras = signal<Camera[]>([]);
  protected readonly selectedCameraIds = signal<Set<string>>(this.loadSelectedIds());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly selectedCameras = computed(() => {
    const selected = this.selectedCameraIds();
    return this.cameras().filter((c) => selected.has(c.id));
  });

  ngOnInit(): void {
    this.loadCameras();
  }

  protected isSelected(cameraId: string): boolean {
    return this.selectedCameraIds().has(cameraId);
  }

  protected toggleCamera(cameraId: string): void {
    this.selectedCameraIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(cameraId)) {
        next.delete(cameraId);
      } else {
        next.add(cameraId);
      }
      this.persistSelectedIds(next);
      return next;
    });
  }

  protected loadCameras(): void {
    this.loading.set(true);
    this.error.set(null);

    this.cameraService.list().subscribe({
      next: (cameras) => {
        this.cameras.set(cameras);
        this.loading.set(false);

        if (cameras.length > 0 && this.selectedCameraIds().size === 0) {
          this.selectFirstCamera(cameras);
        }

        this.logger.info('Câmeras carregadas', { count: cameras.length });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Falha ao carregar câmeras. Tente novamente.');
        this.logger.error('Erro ao carregar câmeras', err);
      },
    });
  }

  private selectFirstCamera(cameras: Camera[]): void {
    const firstId = cameras[0]?.id;
    if (!firstId) return;

    const ids = new Set<string>([firstId]);
    this.selectedCameraIds.set(ids);
    this.persistSelectedIds(ids);
  }

  private loadSelectedIds(): Set<string> {
    const saved = this.localStorage.get<string[]>(SELECTED_CAMERAS_KEY);
    return new Set(saved ?? []);
  }

  private persistSelectedIds(ids: Set<string>): void {
    this.localStorage.set(SELECTED_CAMERAS_KEY, [...ids]);
  }
}
