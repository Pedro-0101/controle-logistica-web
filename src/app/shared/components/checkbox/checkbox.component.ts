import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { checkboxVariants } from './checkbox.variants';

@Component({
  selector: 'z-checkbox',
  template: `
    <button
      type="button"
      role="checkbox"
      [attr.aria-checked]="checked()"
      [attr.data-state]="checked() ? 'checked' : 'unchecked'"
      [class]="classes()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      @if (checked()) {
        <svg class="size-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M13.5 4L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      }
    </button>
  `,
  styles: `
    :host { display: inline-flex; align-items: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZardCheckboxComponent), multi: true }],
  exportAs: 'zCheckbox',
})
export class ZardCheckboxComponent implements ControlValueAccessor {
  readonly checked = model(false);
  readonly zDisabled = input(false);
  readonly class = input<ClassValue>('');

  protected readonly disabled = signal(false);
  protected readonly classes = computed(() => mergeClasses(checkboxVariants(), this.class()));

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onChange: (value: boolean) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled() || this.zDisabled()) return;
    const value = !this.checked();
    this.checked.set(value);
    this._onChange(value);
    this._onTouched();
  }

  writeValue(value: boolean): void { this.checked.set(value ?? false); }
  registerOnChange(fn: (value: boolean) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this._onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}
