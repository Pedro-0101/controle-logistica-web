import { OverlayModule, type ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  model,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { ClassValue } from 'clsx';

import { buttonVariants } from '@/shared/components/button/button.variants';
import { mergeClasses } from '@/shared/utils/merge-classes';

import {
  comboboxGroupLabelVariants,
  comboboxItemVariants,
  comboboxPanelVariants,
  comboboxWidthVariants,
  type ZardComboboxButtonVariant,
  type ZardComboboxWidthVariants,
} from './combobox.variants';

export interface ZardComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ZardComboboxGroup {
  label: string;
  options: ZardComboboxOption[];
}

type ZardComboboxRow = { type: 'label'; label: string } | { type: 'option'; option: ZardComboboxOption; index: number };

let nextComboboxId = 0;

const COMBINING_DIACRITICAL_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

@Component({
  selector: 'z-combobox',
  imports: [OverlayModule],
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      type="button"
      role="combobox"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-controls]="isOpen() ? panelId : null"
      [attr.aria-label]="zAriaLabel() || null"
      [attr.aria-describedby]="zAriaDescribedBy() || null"
      [class]="triggerClasses()"
      [disabled]="isDisabled()"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      <span [class.text-muted-foreground]="!selectedOption()" class="truncate">
        {{ selectedOption()?.label || zPlaceholder() }}
      </span>
      <svg
        class="size-4 shrink-0 opacity-50 transition-transform duration-200"
        [class.rotate-180]="isOpen()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="triggerWidth()"
      [cdkConnectedOverlayHasBackdrop]="false"
      (overlayOutsideClick)="close()"
      (detach)="close()"
    >
      <div [id]="panelId" [class]="panelClasses()" tabindex="-1" (keydown)="onPanelKeydown($event)">
        @if (zSearchable()) {
          <div class="flex items-center gap-2 border-b border-border px-3 py-2">
            <svg
              class="size-4 shrink-0 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              #searchInput
              type="text"
              class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              [placeholder]="zSearchPlaceholder()"
              [value]="query()"
              (input)="onQueryInput($event)"
            />
          </div>
        }

        <div class="max-h-[300px] overflow-y-auto p-1" role="listbox">
          @for (row of renderRows(); track $index) {
            @if (row.type === 'label') {
              <div [class]="groupLabelClasses()">{{ row.label }}</div>
            } @else {
              <div
                role="option"
                tabindex="-1"
                [class]="itemClasses()"
                [class.bg-accent]="row.index === highlightedIndex()"
                [class.text-accent-foreground]="row.index === highlightedIndex()"
                [attr.aria-selected]="row.option.value === zValue()"
                [attr.data-disabled]="row.option.disabled || null"
                (click)="select(row.option)"
                (keydown.enter)="select(row.option)"
                (mouseenter)="highlightedIndex.set(row.index)"
              >
                <svg
                  class="size-4 shrink-0"
                  [class.opacity-0]="row.option.value !== zValue()"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span class="flex-1 truncate">{{ row.option.label }}</span>
              </div>
            }
          }
          @if (noResults()) {
            <div class="py-6 text-center text-sm text-muted-foreground">{{ zEmptyText() }}</div>
          }
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'relative inline-block',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZardComboboxComponent),
      multi: true,
    },
  ],
  exportAs: 'zCombobox',
})
export class ZardComboboxComponent implements ControlValueAccessor {
  readonly zValue = model<string | null>(null);
  readonly zOptions = input<ZardComboboxOption[]>([]);
  readonly zGroups = input<ZardComboboxGroup[]>([]);
  readonly zPlaceholder = input<string>('Selecione...');
  readonly zSearchPlaceholder = input<string>('Buscar...');
  readonly zEmptyText = input<string>('Nenhum resultado encontrado.');
  readonly zSearchable = input<boolean>(true);
  readonly zDisabled = input<boolean>(false);
  readonly zButtonVariant = input<ZardComboboxButtonVariant>('outline');
  readonly zWidth = input<ZardComboboxWidthVariants>('default');
  readonly zAriaLabel = input<string>('');
  readonly zAriaDescribedBy = input<string>('');
  readonly class = input<ClassValue>('');

  readonly zComboSelected = output<ZardComboboxOption>();

  protected readonly panelId = `zcombobox-panel-${nextComboboxId++}`;
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];

  protected readonly isOpen = signal(false);
  protected readonly query = signal('');
  protected readonly highlightedIndex = signal(0);
  protected readonly triggerWidth = signal(0);
  private readonly formDisabled = signal(false);

  private readonly triggerElRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchInputElRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly isDisabled = computed(() => this.formDisabled() || this.zDisabled());
  protected readonly hasGroups = computed(() => this.zGroups().length > 0);

  protected readonly filteredOptions = computed(() => {
    const q = this.normalize(this.query().trim());
    const opts = this.zOptions();
    if (!q) return opts;
    return opts.filter(o => this.normalize(o.label).includes(q));
  });

  protected readonly filteredGroups = computed(() => {
    const q = this.normalize(this.query().trim());
    const groups = this.zGroups();
    if (!q) return groups;
    return groups
      .map(g => ({ ...g, options: g.options.filter(o => this.normalize(o.label).includes(q)) }))
      .filter(g => g.options.length > 0);
  });

  protected readonly renderRows = computed<ZardComboboxRow[]>(() => {
    if (!this.hasGroups()) {
      return this.filteredOptions().map((option, index) => ({ type: 'option', option, index }));
    }
    const rows: ZardComboboxRow[] = [];
    let index = 0;
    for (const group of this.filteredGroups()) {
      rows.push({ type: 'label', label: group.label });
      for (const option of group.options) {
        rows.push({ type: 'option', option, index });
        index++;
      }
    }
    return rows;
  });

  protected readonly flatVisibleOptions = computed(() =>
    this.renderRows()
      .filter((row): row is Extract<ZardComboboxRow, { type: 'option' }> => row.type === 'option')
      .map(row => row.option),
  );

  protected readonly noResults = computed(() => this.renderRows().length === 0);

  protected readonly selectedOption = computed(() => {
    const value = this.zValue();
    if (!value) return undefined;
    const flat = this.hasGroups() ? this.zGroups().flatMap(g => g.options) : this.zOptions();
    return flat.find(o => o.value === value);
  });

  protected readonly triggerClasses = computed(() =>
    mergeClasses(
      buttonVariants({ zType: this.zButtonVariant(), zSize: 'default' }),
      comboboxWidthVariants({ zWidth: this.zWidth() }),
      'justify-between font-normal',
      this.class(),
    ),
  );

  protected readonly panelClasses = computed(() => comboboxPanelVariants());
  protected readonly itemClasses = computed(() => comboboxItemVariants());
  protected readonly groupLabelClasses = computed(() => comboboxGroupLabelVariants());

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onChange: (value: string | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched: () => void = () => {};

  protected toggle(): void {
    if (this.isDisabled()) return;
    const opening = !this.isOpen();
    if (opening) {
      this.triggerWidth.set(this.triggerElRef()?.nativeElement.offsetWidth ?? 0);
      this.query.set('');
      this.highlightedIndex.set(0);
      setTimeout(() => this.searchInputElRef()?.nativeElement.focus(), 0);
    }
    this.isOpen.set(opening);
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this._onTouched();
  }

  protected closeAndFocusTrigger(): void {
    this.close();
    this.triggerElRef()?.nativeElement.focus();
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.highlightedIndex.set(0);
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.isOpen()) this.toggle();
    } else if (event.key === 'Escape' && this.isOpen()) {
      this.closeAndFocusTrigger();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const visible = this.flatVisibleOptions();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.update(i => Math.min(i + 1, visible.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.update(i => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = visible[this.highlightedIndex()];
      if (option) this.select(option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAndFocusTrigger();
    }
  }

  protected select(option: ZardComboboxOption): void {
    if (option.disabled) return;
    this.zValue.set(option.value);
    this._onChange(option.value);
    this.zComboSelected.emit(option);
    this.closeAndFocusTrigger();
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(COMBINING_DIACRITICAL_MARKS, '').toLowerCase();
  }

  writeValue(value: string | null): void {
    this.zValue.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
