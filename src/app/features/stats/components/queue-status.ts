import { Component, computed, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';

import { formatNumber } from '../stats-format';

/** Cartão de fila com profundidade atual, ocupação e workers. */
@Component({
  selector: 'gp-queue-status',
  imports: [NgIcon, ZardBadgeComponent, ZardCardComponent],
  template: `
    <z-card class="h-full">
      <div class="flex h-full flex-col gap-3 p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="flex items-center gap-2 text-sm font-medium">
            <ng-icon [name]="icon()" aria-hidden="true" class="size-4 text-muted-foreground" />
            {{ title() }}
          </h3>
          <z-badge [zType]="statusType()" zShape="pill">{{ statusLabel() }}</z-badge>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-semibold tabular-nums">{{ formatNumber(pending()) }}</span>
          <span class="text-xs text-muted-foreground">aguardando</span>
        </div>

        <div class="flex flex-col gap-1">
          <div
            class="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            [attr.aria-valuenow]="occupancy()"
            aria-valuemin="0"
            aria-valuemax="100"
            [attr.aria-label]="title() + ': ' + occupancy() + '% da capacidade ocupada'"
          >
            <div
              [class]="meterClass()"
              class="h-full rounded-full"
              [style.width.%]="occupancy()"
            ></div>
          </div>
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>{{ formatNumber(active()) }} em execução</span>
            <span>{{ capacityLabel() }}</span>
          </div>
        </div>

        <p class="text-xs leading-snug text-muted-foreground">{{ hint() }}</p>
      </div>
    </z-card>
  `,
})
export class QueueStatus {
  readonly title = input.required<string>();
  readonly icon = input('lucideInbox');
  readonly pending = input(0);
  readonly active = input(0);
  readonly capacity = input<number | null>(null);
  readonly workers = input<number | null>(null);
  readonly hint = input<string>('');

  protected readonly occupancy = computed(() => {
    const capacity = this.capacity();
    if (!capacity || capacity <= 0) return 0;
    return Math.min(100, Math.round((this.pending() / capacity) * 100));
  });

  protected readonly capacityLabel = computed(() => {
    const capacity = this.capacity();
    const workers = this.workers();
    const parts: string[] = [];
    if (capacity && capacity > 0) parts.push(`capacidade ${formatNumber(capacity)}`);
    if (workers && workers > 0) parts.push(`${formatNumber(workers)} workers`);
    return parts.length ? parts.join(' · ') : 'capacidade não informada';
  });

  protected readonly statusLabel = computed(() => {
    const capacity = this.capacity();
    if (this.pending() === 0 && this.active() === 0) return 'Ociosa';
    if (!capacity || capacity <= 0) return 'Sem limite';
    return this.occupancy() >= 80 ? 'Saturada' : 'Em fluxo';
  });

  protected readonly statusType = computed<'default' | 'secondary' | 'destructive' | 'outline'>(
    () => {
      const capacity = this.capacity();
      if (this.pending() === 0 && this.active() === 0) return 'secondary';
      if (!capacity || capacity <= 0) return 'outline';
      return this.occupancy() >= 80 ? 'destructive' : 'default';
    },
  );

  protected readonly meterClass = computed(() =>
    this.occupancy() >= 80
      ? 'bg-destructive'
      : this.occupancy() >= 50
        ? 'bg-warning'
        : 'bg-primary',
  );

  protected readonly formatNumber = formatNumber;
}
