import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';

export type StatTone = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'primary';

const TONE_TEXT: Record<StatTone, string> = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
  primary: 'text-primary',
};

/** Cartão compacto de indicador, com ícone, valor e uma linha de contexto. */
@Component({
  selector: 'gp-metric-tile',
  imports: [NgIcon, ZardBadgeComponent, ZardCardComponent],
  template: `
    <z-card class="h-full">
      <div class="flex h-full flex-col gap-2 p-4">
        <div class="flex items-start justify-between gap-2">
          <span class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ng-icon [name]="icon()" aria-hidden="true" [class]="iconClasses()" />
            {{ label() }}
          </span>

          @if (badge(); as badgeText) {
            <z-badge [zType]="badgeType()" zShape="pill">{{ badgeText }}</z-badge>
          }
        </div>

        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span class="text-2xl font-semibold tracking-tight tabular-nums">{{ value() }}</span>
          @if (valueHint()) {
            <span class="text-xs text-muted-foreground">{{ valueHint() }}</span>
          }
        </div>

        @if (hint()) {
          <p class="text-xs leading-snug text-muted-foreground">{{ hint() }}</p>
        }
      </div>
    </z-card>
  `,
})
export class MetricTile {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly valueHint = input<string>('');
  readonly hint = input<string>('');
  readonly icon = input('lucideActivity');
  readonly tone = input<StatTone>('default');
  readonly badge = input<string>('');
  readonly badgeType = input<'default' | 'secondary' | 'destructive' | 'outline'>('outline');

  protected readonly iconClasses = computed(() => `size-4 ${TONE_TEXT[this.tone()]}`);
}
