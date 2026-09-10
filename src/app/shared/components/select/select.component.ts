import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  ElementRef,
  forwardRef,
  HostListener,
  inject,
  input,
  model,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { type ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { mergeClasses } from '@/shared/utils/merge-classes';
import { selectVariants, type ZardSelectVariants } from './select.variants';
import { ZardSelectItemComponent } from './select-item.component';
import { ZardEmptyComponent } from '../empty/empty.component';

@Component({
  selector: 'z-select',
  imports: [ZardEmptyComponent],
  template: `
     @if (zLabel(); as label) {
       <label class="block text-sm font-medium mb-1 text-foreground" for="zselect-trigger">{{ label }}</label>
     }

     <button
       id="zselect-trigger"
       type="button"
       role="combobox"
       [attr.aria-controls]="isOpen() ? 'zselect-listbox' : undefined"
      [class]="triggerClasses()"
      [disabled]="disabled() || zDisabled()"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-label]="zPlaceholder()"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
    >
      @if (zMultiple()) {
        @if (selectedValues().length > 0) {
           <div class="flex flex-wrap gap-1 items-center">
             @for (value of selectedValues().slice(0, zMaxLabelCount()); track value) {
               <span class="inline-flex items-center gap-1 rounded border border-border bg-secondary px-1.5 py-0.5 text-xs leading-none">
                {{ getItemLabel(value) }}
                <button
                  type="button"
                  class="hover:text-foreground ml-0.5 leading-none"
                  tabindex="-1"
                  (click)="removeValue(value); $event.stopPropagation()"
                >
                  <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            }
            @if (selectedValues().length > zMaxLabelCount()) {
              <span class="text-xs text-muted-foreground whitespace-nowrap">
                +{{ selectedValues().length - zMaxLabelCount() }}
              </span>
            }
          </div>
        } @else {
          <span class="text-muted-foreground truncate">{{ zPlaceholder() }}</span>
        }
      } @else {
        <span [class.text-muted-foreground]="!selectedItem()" class="truncate">
          {{ displayText() || zPlaceholder() }}
        </span>
      }
      <svg
        class="size-4 shrink-0 transition-transform duration-200"
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

    @if (isOpen()) {
      <div
        class="absolute z-50 mt-1 left-0 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        role="listbox"
        id="zselect-listbox"
        [attr.aria-multiselectable]="zMultiple() || null"
      >
        @if (hasItems()) {
          <ng-content />
        } @else {
          <z-empty zSize="sm" zTitle="Nenhum item disponível" zIcon="lucideInbox" />
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'relative inline-block',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZardSelectComponent),
      multi: true,
    },
  ],
  exportAs: 'zSelect',
})
export class ZardSelectComponent implements ControlValueAccessor {
  readonly zValue = model<string | string[]>('');
  readonly zMultiple = input<boolean>(false);
  readonly zMaxLabelCount = input<number>(1);
  readonly zPlaceholder = input<string>('Select an option...');
  readonly zLabel = input<string>('');
  readonly zError = input<ZardSelectVariants['zError']>(false);
  readonly zDisabled = input<boolean>(false);
  readonly class = input<ClassValue>('');

  readonly zSelectionChange = output<string | string[]>();

  protected readonly isOpen = signal(false);
  protected readonly disabled = signal(false);


  private readonly elementRef = inject(ElementRef);

  readonly items = contentChildren(ZardSelectItemComponent);

  protected readonly hasItems = computed(() => this.items().length > 0);

  protected readonly selectedValues = computed<string[]>(() => {
    const v = this.zValue();
    if (this.zMultiple()) {
      return Array.isArray(v) ? v : [];
    }
    return typeof v === 'string' && v ? [v] : [];
  });

  protected readonly selectedItem = computed(() => {
    const values = this.selectedValues();
    if (values.length === 0) return undefined;
    return this.items().find(item => item.zValue() === values[0]);
  });

  protected readonly displayText = computed(() =>
    this.selectedItem()?.getLabel() || this.selectedValues()[0] || '',
  );

  protected readonly triggerClasses = computed(() =>
    mergeClasses(selectVariants({ zError: this.zError() }), this.class()),
  );

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onChange: (value: string | string[]) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched: () => void = () => {};

  getItemLabel(value: string): string {
    const item = this.items().find(i => i.zValue() === value);
    return item?.getLabel() || value;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected toggle(): void {
    if (this.disabled() || this.zDisabled()) return;
    this.isOpen.update(v => !v);
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this._onTouched();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  selectValue(value: string): void {
    if (this.zMultiple()) {
      const current = this.selectedValues();
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      this.zValue.set(updated);
      this._onChange(updated);
      this.zSelectionChange.emit(updated);
    } else {
      this.zValue.set(value);
      this._onChange(value);
      this.zSelectionChange.emit(value);
      this.close();
    }
  }

  removeValue(value: string): void {
    if (!this.zMultiple()) return;
    const updated = this.selectedValues().filter(v => v !== value);
    this.zValue.set(updated);
    this._onChange(updated);
    this.zSelectionChange.emit(updated);
  }

  writeValue(value: string | string[]): void {
    if (this.zMultiple()) {
      this.zValue.set(Array.isArray(value) ? value : []);
    } else {
      this.zValue.set(typeof value === 'string' ? value : '');
    }
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
