import { Component, computed, input } from '@angular/core';

import { formatMs, formatNumber } from '../stats-format';

export type LatencyTone =
  'primary' | 'info' | 'success' | 'warning' | 'chart2' | 'chart3' | 'chart4' | 'chart5';

export interface LatencyBarItem {
  key: string;
  label: string;
  hint?: string;
  p50: number | null;
  p95: number | null;
  samples?: number | null;
  tone?: LatencyTone;
  /** Destaca linhas de total (reconhecimento e registro). */
  emphasis?: boolean;
}

const TONE_BAR: Record<LatencyTone, string> = {
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  chart2: 'bg-chart-2',
  chart3: 'bg-chart-3',
  chart4: 'bg-chart-4',
  chart5: 'bg-chart-5',
};

/**
 * Gráfico horizontal de latência por etapa: barra sólida = mediana (p50),
 * barra esmaecida = cauda (p95). Escala compartilhada entre as linhas.
 */
@Component({
  selector: 'gp-latency-bars',
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-foreground/70" aria-hidden="true"></span>
          Mediana (p50)
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-foreground/25" aria-hidden="true"></span>
          Cauda (p95)
        </span>
        <span class="ml-auto">escala comum: {{ formatMs(max()) }}</span>
      </div>

      <ul class="flex flex-col gap-4" [attr.aria-label]="ariaLabel()">
        @for (item of items(); track item.key) {
          <li class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span class="text-sm" [class.font-semibold]="item.emphasis">{{ item.label }}</span>
                @if (item.hint) {
                  <span class="text-xs text-muted-foreground">{{ item.hint }}</span>
                }
              </span>

              <span class="text-xs tabular-nums text-muted-foreground">
                p50
                <span class="font-semibold text-foreground">{{ formatMs(item.p50) }}</span>
                · p95 {{ formatMs(item.p95) }}
                @if (item.samples !== null && item.samples !== undefined) {
                  · {{ formatNumber(item.samples) }} amostras
                }
              </span>
            </div>

            <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                [class]="barClass(item.tone)"
                class="absolute inset-y-0 left-0 rounded-full opacity-25"
                [style.width.%]="percent(item.p95)"
                aria-hidden="true"
              ></div>
              <div
                [class]="barClass(item.tone)"
                class="absolute inset-y-0 left-0 rounded-full"
                [style.width.%]="percent(item.p50)"
                aria-hidden="true"
              ></div>
            </div>
          </li>
        } @empty {
          <li class="py-6 text-center text-sm text-muted-foreground">
            Nenhuma amostra de latência disponível no momento.
          </li>
        }
      </ul>
    </div>
  `,
})
export class LatencyBars {
  readonly items = input<LatencyBarItem[]>([]);
  readonly ariaLabel = input('Latência por etapa');

  protected readonly max = computed(() => {
    const values = this.items()
      .flatMap((item) => [item.p50, item.p95])
      .filter((value): value is number => value !== null && Number.isFinite(value));
    return Math.max(1, ...values);
  });

  protected percent(value: number | null | undefined): number {
    if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return 0;
    return Math.min(100, (value / this.max()) * 100);
  }

  protected barClass(tone: LatencyTone | undefined): string {
    return TONE_BAR[tone ?? 'primary'];
  }

  protected readonly formatMs = formatMs;
  protected readonly formatNumber = formatNumber;
}
