import { Component, computed, input, output } from '@angular/core';

import type {
  NotificationAvailableFilters,
  NotificationCameraOption,
  NotificationFilterDefinition,
  NotificationFilters,
} from '@/shared/models';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSwitchComponent } from '@/shared/components/switch';

@Component({
  selector: 'app-notification-filters-editor',
  imports: [ZardSelectImports, ZardSwitchComponent],
  template: `
    @if (zFilters().length === 0) {
      <p class="text-sm text-muted-foreground">Este evento não possui filtros adicionais.</p>
    } @else {
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        @for (filter of zFilters(); track filter.key) {
          @switch (filter.kind) {
            @case ('points') {
              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">{{ filter.label }}</span>
                <z-select
                  [zMultiple]="true"
                  [zValue]="selectedValues(filter.key)"
                  [zPlaceholder]="'Todos os pontos'"
                  [zDisabled]="zDisabled()"
                  (zSelectionChange)="onMultiChange(filter.key, $event)"
                >
                  @for (point of zAvailable().points; track point.id) {
                    <z-select-item [zValue]="point.id">
                      {{ point.name }} ({{ point.code }})
                    </z-select-item>
                  }
                </z-select>
              </div>
            }

            @case ('cameras') {
              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">{{ filter.label }}</span>
                <z-select
                  [zMultiple]="true"
                  [zValue]="selectedValues(filter.key)"
                  [zPlaceholder]="'Todas as câmeras'"
                  [zDisabled]="zDisabled()"
                  (zSelectionChange)="onMultiChange(filter.key, $event)"
                >
                  @for (camera of availableCameras(); track camera.id) {
                    <z-select-item [zValue]="camera.id">{{ camera.name }}</z-select-item>
                  }
                </z-select>
              </div>
            }

            @case ('options') {
              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">{{ filter.label }}</span>
                <z-select
                  [zMultiple]="true"
                  [zValue]="selectedValues(filter.key)"
                  [zPlaceholder]="'Todos'"
                  [zDisabled]="zDisabled()"
                  (zSelectionChange)="onMultiChange(filter.key, $event)"
                >
                  @for (option of filter.options ?? []; track option.value) {
                    <z-select-item [zValue]="option.value">{{ option.label }}</z-select-item>
                  }
                </z-select>
              </div>
            }

            @case ('boolean') {
              <label class="flex items-center gap-2 self-end pb-2 text-sm text-muted-foreground">
                <z-switch
                  [checked]="booleanValue(filter.key)"
                  [zDisabled]="zDisabled()"
                  (checkedChange)="onBooleanChange(filter.key, $event)"
                />
                {{ filter.label }}
              </label>
            }
          }
        }
      </div>
    }
  `,
})
export class NotificationFiltersEditor {
  readonly zFilters = input.required<NotificationFilterDefinition[]>();
  readonly zAvailable = input.required<NotificationAvailableFilters>();
  readonly zValue = input<NotificationFilters>({});
  readonly zDisabled = input(false);

  readonly zValueChange = output<NotificationFilters>();

  protected readonly availableCameras = computed<NotificationCameraOption[]>(() => {
    const pointIds = this.selectedValues('pointIds');
    const cameras = this.zAvailable().cameras;
    if (pointIds.length === 0) return cameras;
    const allowed = new Set(pointIds);
    return cameras.filter((camera) => allowed.has(camera.pointId));
  });

  protected selectedValues(key: string): string[] {
    const value = this.zValue()[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  protected booleanValue(key: string): boolean {
    return this.zValue()[key] === true;
  }

  protected onMultiChange(key: string, value: string | string[]): void {
    this.update(key, Array.isArray(value) ? value : [value]);
  }

  protected onBooleanChange(key: string, value: boolean): void {
    this.update(key, value);
  }

  private update(key: string, value: unknown): void {
    this.zValueChange.emit({ ...this.zValue(), [key]: value });
  }
}
