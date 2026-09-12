import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';

import { NgIcon } from '@ng-icons/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { CameraStream } from '@/shared/components/camera-stream';
import { ZardButtonComponent } from '@/shared/components/button';
import {
  ZardComboboxComponent,
  type ZardComboboxOption,
} from '@/shared/components/combobox/combobox.component';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { EmptyState } from '@/shared/components/empty-state/empty-state';
import { CameraService } from '@/shared/services/camera.service';
import { LocalStorageService } from '@/shared/services/local-storage.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { Camera } from '@/shared/models';

type LayoutType = '1' | '2' | '4';

interface CameraSlot {
  index: number;
  cameraId: string | null;
}

const LAYOUT_KEY = 'camera-layout';
const SLOTS_KEY = 'camera-slots';

const SLOT_COUNT_MAP: Record<LayoutType, number> = { '1': 1, '2': 2, '4': 4 };

const GRID_CLASSES: Record<LayoutType, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 lg:grid-cols-2',
  '4': 'grid-cols-1 sm:grid-cols-2 grid-rows-[1fr_1fr]',
};

@Component({
  selector: 'app-cameras-monitoring',
  imports: [
    SiteHeader,
    CameraStream,
    ZardButtonComponent,
    ZardComboboxComponent,
    NgIcon,
    LoadingSpinner,
    EmptyState,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1800px] flex-col overflow-hidden px-4">
      <div class="flex shrink-0 flex-col gap-1 pt-4 pb-2">
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
        <section class="flex min-h-0 flex-1 flex-col gap-3 pb-2">
          <div class="flex shrink-0 flex-wrap items-center gap-4">
            <div class="flex items-center gap-1" role="radiogroup" aria-label="Layout de câmeras">
              <span class="mr-1 text-xs font-medium text-muted-foreground">Layout:</span>
              @for (opt of layoutOptions; track opt.value) {
                <button
                  z-button
                  [zType]="layout() === opt.value ? 'default' : 'outline'"
                  zSize="sm"
                  role="radio"
                  [attr.aria-checked]="layout() === opt.value"
                  [attr.aria-label]="opt.label"
                  (click)="setLayout(opt.value)"
                class="gap-1.5"
                >
                  <svg
                    class="size-3.5 shrink-0 order-first"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    @switch (opt.value) {
                      @case ('1') {
                        <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
                      }
                      @case ('2') {
                        <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
                        <line x1="8" y1="1.5" x2="8" y2="14.5" />
                      }
                      @case ('4') {
                        <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
                        <line x1="8" y1="1.5" x2="8" y2="14.5" />
                        <line x1="1.5" y1="8" x2="14.5" y2="8" />
                      }
                    }
                  </svg>
                  <span class="order-last">{{ opt.label }}</span>
                </button>
              }
            </div>

            <div class="flex flex-wrap items-center gap-3">
              @for (slot of visibleSlots(); track slot.index) {
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground">{{ slot.index + 1 }}ª:</span>
                  <z-combobox
                    zPlaceholder="Selecione uma câmera"
                    zSearchPlaceholder="Buscar câmera..."
                    zEmptyText="Nenhuma câmera disponível"
                    [zOptions]="slotOptions(slot.index)"
                    [zValue]="slot.cameraId"
                    [zAriaLabel]="'Selecionar câmera para slot ' + (slot.index + 1)"
                    (zComboSelected)="onSlotCameraChange(slot.index, $event.value)"
                  />
                </div>
              }
            </div>
          </div>

          @if (hasAnyCamera()) {
            <section
              class="grid min-h-0 flex-1 gap-4"
              [class]="gridClasses()"
              role="tabpanel"
              aria-label="Streams das câmeras"
            >
              @for (slot of visibleSlots(); track slot.index) {
                @if (getCameraForSlot(slot); as camera) {
                  @if (camera.streamUrls?.hlsUrl) {
                    <gp-camera-stream
                      [src]="camera.streamUrls.hlsUrl"
                      [title]="camera.name"
                      [anpr]="true"
                      [class.fill-height]="layout() === '2'"
                    />
                  } @else {
                    <div
                      class="flex min-h-0 items-center justify-center rounded-md border border-border bg-muted/50"
                      [attr.aria-label]="'Câmera ' + camera.name + ' sem stream disponível'"
                    >
                      <p class="text-sm text-muted-foreground">Stream não disponível</p>
                    </div>
                  }
                } @else {
                  <div
                    class="flex min-h-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30"
                    [attr.aria-label]="'Slot ' + (slot.index + 1) + ' vazio'"
                  >
                    <div class="flex flex-col items-center gap-2">
                      <ng-icon name="lucideCamera" class="size-8 text-muted-foreground/50" aria-hidden="true" />
                      <p class="text-xs text-muted-foreground">
                        Selecione uma câmera para o slot {{ slot.index + 1 }}
                      </p>
                    </div>
                  </div>
                }
              }
            </section>
          } @else {
            <div class="flex items-center justify-center py-8">
              <p class="text-sm text-muted-foreground">
                Selecione câmeras nos slots acima para visualizar os streams.
              </p>
            </div>
          }
        </section>
      }
    </main>
  `,
})
export class CamerasMonitoring implements OnInit {
  private readonly cameraService = inject(CameraService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly logger = inject(LoggerService).create('CamerasMonitoring');

  protected readonly cameras = signal<Camera[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly layout = signal<LayoutType>(this.loadLayout());
  protected readonly slots = signal<CameraSlot[]>(this.loadSlots());

  protected readonly layoutOptions: { value: LayoutType; label: string }[] = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '4', label: '4' },
  ];

  protected readonly visibleSlots = computed(() => {
    const count = SLOT_COUNT_MAP[this.layout()];
    const current = this.slots();
    const result: CameraSlot[] = [];
    for (let i = 0; i < count; i++) {
      result.push(current[i] ?? { index: i, cameraId: null });
    }
    return result;
  });

  protected readonly gridClasses = computed(() => GRID_CLASSES[this.layout()]);

  protected readonly hasAnyCamera = computed(() =>
    this.visibleSlots().some((s) => s.cameraId !== null),
  );

  private readonly _syncSlots = effect(() => {
    this.persistSlots(this.slots());
  });

  ngOnInit(): void {
    this.loadCameras();
  }

  protected setLayout(value: LayoutType): void {
    this.layout.set(value);
    this.localStorage.set(LAYOUT_KEY, value);
  }

  protected slotOptions(slotIndex: number): ZardComboboxOption[] {
    return this.cameras().map((c) => ({
      value: c.id,
      label: c.name,
    }));
  }

  protected getCameraForSlot(slot: CameraSlot): Camera | undefined {
    if (!slot.cameraId) return undefined;
    return this.cameras().find((c) => c.id === slot.cameraId);
  }

  protected onSlotCameraChange(slotIndex: number, cameraId: string | null): void {
    this.slots.update((current) => {
      const next = [...current];
      const existing = next[slotIndex];
      if (existing) {
        next[slotIndex] = { ...existing, cameraId };
      } else {
        next[slotIndex] = { index: slotIndex, cameraId };
      }
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
        this.autoAssignIfEmpty(cameras);
        this.logger.info('Câmeras carregadas', { count: cameras.length });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set('Falha ao carregar câmeras. Tente novamente.');
        this.logger.error('Erro ao carregar câmeras', err);
      },
    });
  }

  private autoAssignIfEmpty(cameras: Camera[]): void {
    const hasAssigned = this.slots().some((s) => s.cameraId !== null);
    if (hasAssigned || cameras.length === 0) return;

    const count = SLOT_COUNT_MAP[this.layout()];
    const initial: CameraSlot[] = [];
    for (let i = 0; i < count; i++) {
      initial.push({ index: i, cameraId: cameras[i % cameras.length]?.id ?? null });
    }
    this.slots.set(initial);
  }

  private loadLayout(): LayoutType {
    const saved = this.localStorage.get<LayoutType>(LAYOUT_KEY);
    if (saved && saved in SLOT_COUNT_MAP) return saved;
    return '2';
  }

  private loadSlots(): CameraSlot[] {
    const saved = this.localStorage.get<CameraSlot[]>(SLOTS_KEY);
    if (Array.isArray(saved)) return saved;
    return [
      { index: 0, cameraId: null },
      { index: 1, cameraId: null },
    ];
  }

  private persistSlots(slots: CameraSlot[]): void {
    this.localStorage.set(SLOTS_KEY, slots);
  }
}
