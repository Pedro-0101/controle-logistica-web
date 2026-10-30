import { Component, computed, input } from '@angular/core';

import { formatMs, formatNumber } from '../stats-format';

export interface LatencyRangeItem {
  key: string;
  label: string;
  hint?: string;
  min: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
  samples?: number | null;
}

/**
 * Faixa de dispersão (mínimo → máximo) com marcas de mediana e p95.
 * A escala é compartilhada para permitir comparar as etapas entre si.
 */
@Component({
  selector: 'gp-latency-range',
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <span class="h-1.5 w-4 rounded-full bg-chart-2/50" aria-hidden="true"></span>
          faixa mín–máx
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full bg-primary" aria-hidden="true"></span>
          mediana
        </span>
        <span class="flex items-center gap-1.5">
          <span class="h-3 w-px bg-chart-4" aria-hidden="true"></span>
          p95
        </span>
        <span class="ml-auto">escala comum: {{ formatMs(max()) }}</span>
      </div>

      <ul class="flex flex-col gap-5" [attr.aria-label]="ariaLabel()">
        @for (item of items(); track item.key) {
          <li class="flex flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span class="flex flex-wrap items-baseline gap-x-2">
                <span class="text-sm">{{ item.label }}</span>
                @if (item.hint) {
                  <span class="text-xs text-muted-foreground">{{ item.hint }}</span>
                }
              </span>
              <span class="text-xs tabular-nums text-muted-foreground">
                mín {{ formatMs(item.min) }} · p50
                <span class="font-semibold text-foreground">{{ formatMs(item.p50) }}</span>
                · máx {{ formatMs(item.max) }}
                @if (item.samples !== null && item.samples !== undefined) {
                  · {{ formatNumber(item.samples) }} amostras
                }
              </span>
            </div>

            <div class="relative h-5 w-full rounded-full bg-muted/70">
              @if (rangeLeft(item) !== null && rangeWidth(item) !== null) {
                <div
                  class="absolute inset-y-1.5 rounded-full bg-chart-2/50"
                  [style.left.%]="rangeLeft(item)"
                  [style.width.%]="rangeWidth(item)"
                  aria-hidden="true"
                ></div>
              }
              @if (position(item.p95) !== null) {
                <div
                  class="absolute inset-y-1 w-px bg-chart-4"
                  [style.left.%]="position(item.p95)"
                  aria-hidden="true"
                ></div>
              }
              @if (position(item.p50) !== null) {
                <div
                  class="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
                  [style.left.%]="position(item.p50)"
                  aria-hidden="true"
                ></div>
              }
            </div>
          </li>
        } @empty {
          <li class="py-6 text-center text-sm text-muted-foreground">
            Nenhuma distribuição disponível no momento.
          </li>
        }
      </ul>
    </div>
  `,
})
export class LatencyRange {
  readonly items = input<LatencyRangeItem[]>([]);
  readonly ariaLabel = input('Dispersão da latência');

  protected readonly max = computed(() => {
    const values = this.items()
      .flatMap((item) => [item.min, item.p50, item.p95, item.max])
      .filter((value): value is number => value !== null && Number.isFinite(value));
    return Math.max(1, ...values);
  });

  protected position(value: number | null | undefined): number | null {
    if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return null;
    return Math.min(100, (value / this.max()) * 100);
  }

  protected rangeLeft(item: LatencyRangeItem): number | null {
    return this.position(item.min);
  }

  protected rangeWidth(item: LatencyRangeItem): number | null {
    const left = this.position(item.min);
    const right = this.position(item.max);
    if (left === null || right === null) return null;
    return Math.max(1, right - left);
  }

  protected readonly formatMs = formatMs;
  protected readonly formatNumber = formatNumber;
}
