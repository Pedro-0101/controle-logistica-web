import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { formatMs, formatNumber } from '../stats-format';

export type PipelineTone = 'chart1' | 'chart2' | 'chart3' | 'chart4' | 'chart5';

export interface PipelineSegment {
  key: string;
  label: string;
  ms: number;
  tone: PipelineTone;
}

export interface PipelineMilestone {
  p50: number | null;
  p95: number | null;
  samples: number | null;
}

const TONE_BAR: Record<PipelineTone, string> = {
  chart1: 'bg-chart-1',
  chart2: 'bg-chart-2',
  chart3: 'bg-chart-3',
  chart4: 'bg-chart-4',
  chart5: 'bg-chart-5',
};

/**
 * Linha do tempo empilhada do reconhecimento até o registro do movimento.
 * Os segmentos usam medianas; os marcos exibem os totais medidos (p50/p95).
 */
@Component({
  selector: 'gp-pipeline-timeline',
  imports: [NgIcon],
  template: `
    <div class="flex flex-col gap-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border border-border bg-muted/30 p-4">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ng-icon name="lucideScanLine" aria-hidden="true" class="size-4 text-chart-2" />
            Veículo reconhecido
          </div>
          <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span class="text-3xl font-semibold tracking-tight tabular-nums">
              {{ formatMs(recognition()?.p50) }}
            </span>
            <span class="text-xs text-muted-foreground">
              p95 {{ formatMs(recognition()?.p95) }}
              @if (recognition()?.samples !== null && recognition()?.samples !== undefined) {
                · {{ formatNumber(recognition()?.samples) }} leituras
              }
            </span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            Da captura do frame ao fim da inferência no serviço ANPR.
          </p>
        </div>

        <div class="rounded-xl border border-border bg-muted/30 p-4">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ng-icon name="lucideCircleCheckBig" aria-hidden="true" class="size-4 text-success" />
            Movimento registrado
          </div>
          <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span class="text-3xl font-semibold tracking-tight tabular-nums">
              {{ formatMs(registration()?.p50) }}
            </span>
            <span class="text-xs text-muted-foreground">
              p95 {{ formatMs(registration()?.p95) }}
              @if (registration()?.samples !== null && registration()?.samples !== undefined) {
                · {{ formatNumber(registration()?.samples) }} registros
              }
            </span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            Da captura do frame à conclusão do registro automático no Nest.
          </p>
        </div>
      </div>

      @if (totalMs() > 0) {
        <div class="flex flex-col gap-2">
          <div
            class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
          >
            <span>Composição estimada pela mediana de cada etapa</span>
            <span class="tabular-nums">
              total estimado
              <span class="font-semibold text-foreground">{{ formatMs(totalMs()) }}</span>
            </span>
          </div>

          <div
            class="flex h-4 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            [attr.aria-label]="chartLabel()"
          >
            @for (segment of segments(); track segment.key) {
              <div
                [class]="barClass(segment.tone)"
                class="h-full"
                [style.width.%]="share(segment)"
                [attr.title]="segment.label + ': ' + formatMs(segment.ms)"
              ></div>
            }
          </div>

          <ul class="grid gap-x-6 gap-y-2 pt-1 sm:grid-cols-2">
            @for (segment of segments(); track segment.key) {
              <li class="flex items-center justify-between gap-3 text-xs">
                <span class="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span
                    [class]="barClass(segment.tone)"
                    class="size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                  ></span>
                  <span class="truncate">{{ segment.label }}</span>
                </span>
                <span class="shrink-0 tabular-nums">
                  <span class="font-medium text-foreground">{{ formatMs(segment.ms) }}</span>
                  <span class="text-muted-foreground"> · {{ shareLabel(segment) }}</span>
                </span>
              </li>
            }
          </ul>
        </div>
      } @else {
        <p
          class="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
        >
          Ainda não há amostras suficientes para compor a linha do tempo.
        </p>
      }

      <p class="text-xs leading-relaxed text-muted-foreground">
        Os marcos usam relógio de parede entre serviços e pressupõem relógios sincronizados. A
        espera na fila do ANPR está incluída na idade do frame.
      </p>
    </div>
  `,
})
export class PipelineTimeline {
  readonly segments = input<PipelineSegment[]>([]);
  readonly recognition = input<PipelineMilestone | null>(null);
  readonly registration = input<PipelineMilestone | null>(null);

  protected readonly totalMs = computed(() =>
    this.segments().reduce((total, segment) => total + segment.ms, 0),
  );

  protected readonly chartLabel = computed(() => {
    const parts = this.segments().map(
      (segment) => `${segment.label}: ${this.formatMs(segment.ms)}`,
    );
    return parts.length ? `Composição do tempo — ${parts.join('; ')}` : 'Composição do tempo';
  });

  protected share(segment: PipelineSegment): number {
    const total = this.totalMs();
    if (!total) return 0;
    return (segment.ms / total) * 100;
  }

  protected shareLabel(segment: PipelineSegment): string {
    return `${this.share(segment).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  }

  protected barClass(tone: PipelineTone): string {
    return TONE_BAR[tone];
  }

  protected readonly formatMs = formatMs;
  protected readonly formatNumber = formatNumber;
}
