import { Component, computed, input } from '@angular/core';

import { formatNumber, formatRatio } from '../stats-format';

export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  hint?: string;
}

const TONE_GRADIENT = ['bg-primary/85', 'bg-primary/70', 'bg-primary/55', 'bg-primary/40'];

/** Funil de volume: cada etapa é proporcional ao primeiro passo da série. */
@Component({
  selector: 'gp-funnel-chart',
  template: `
    <div class="flex flex-col gap-4">
      <ol class="flex flex-col gap-3" [attr.aria-label]="ariaLabel()">
        @for (step of steps(); track step.key; let index = $index; let first = $first) {
          <li class="flex flex-col gap-1.5">
            @if (!first) {
              <div class="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                <span aria-hidden="true">↓</span>
                <span>{{ conversionLabel(index) }}</span>
              </div>
            }

            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span class="text-sm">{{ step.label }}</span>
              <span class="text-sm font-semibold tabular-nums">{{ formatNumber(step.value) }}</span>
            </div>

            <div class="h-6 w-full rounded-md bg-muted/60">
              <div
                [class]="gradientClass(index)"
                class="flex h-full min-w-[2px] items-center rounded-md transition-[width]"
                [style.width.%]="width(step)"
              ></div>
            </div>

            @if (step.hint) {
              <span class="text-xs text-muted-foreground">{{ step.hint }}</span>
            }
          </li>
        } @empty {
          <li class="py-6 text-center text-sm text-muted-foreground">
            Nenhum volume registrado no momento.
          </li>
        }
      </ol>
    </div>
  `,
})
export class FunnelChart {
  readonly steps = input<FunnelStep[]>([]);
  readonly ariaLabel = input('Funil de volume');

  protected readonly baseline = computed(() => {
    const values = this.steps().map((step) => step.value);
    return Math.max(1, ...values);
  });

  protected width(step: FunnelStep): number {
    if (step.value <= 0) return 0;
    return Math.max(2, Math.min(100, (step.value / this.baseline()) * 100));
  }

  protected conversionLabel(index: number): string {
    const steps = this.steps();
    const previous = steps[index - 1];
    const current = steps[index];
    if (!previous || !current || previous.value <= 0) return '—';
    const ratio = current.value / previous.value;
    return `${formatRatio(ratio)} do passo anterior`;
  }

  protected gradientClass(index: number): string {
    return TONE_GRADIENT[Math.min(index, TONE_GRADIENT.length - 1)] ?? 'bg-primary/40';
  }

  protected readonly formatNumber = formatNumber;
}
