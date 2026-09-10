import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { switchVariants, switchThumbVariants } from './switch.variants';

@Component({
  selector: 'z-switch',
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.data-state]="checked() ? 'checked' : 'unchecked'"
      [class]="switchClasses()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span [class]="thumbClasses()" [attr.data-state]="checked() ? 'checked' : 'unchecked'"></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZardSwitchComponent), multi: true }],
  exportAs: 'zSwitch',
})
export class ZardSwitchComponent implements ControlValueAccessor {
  readonly checked = model(false);
  readonly zSize = input<'default' | 'sm'>('default');
  readonly zDisabled = input(false);
  readonly class = input<ClassValue>('');

  protected readonly disabled = signal(false);

  protected readonly switchClasses = computed(() => mergeClasses(switchVariants({ zSize: this.zSize() }), this.class()));
  protected readonly thumbClasses = computed(() => switchThumbVariants({ zSize: this.zSize() }));

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
