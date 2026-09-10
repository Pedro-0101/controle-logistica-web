import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  Injectable,
  input,
  OnDestroy,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import type { ClassValue } from 'clsx';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { radioVariants } from './radio.variants';

@Injectable({ providedIn: 'root' })
export class ZardRadioRegistry {
  private readonly radios = new Set<ZardRadioComponent>();

  register(radio: ZardRadioComponent): void {
    this.radios.add(radio);
  }

  unregister(radio: ZardRadioComponent): void {
    this.radios.delete(radio);
  }

  notifySelected(selected: ZardRadioComponent): void {
    for (const radio of this.radios) {
      if (radio !== selected && radio.name() === selected.name()) {
        radio.syncGroupValue(selected.value());
      }
    }
  }
}

@Component({
  selector: 'span[z-radio]',
  template: `
    <span [class]="classes()">
      @if (checked()) {
        <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 overflow-visible">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" class="text-primary"/>
          <circle cx="8" cy="8" r="4" fill="currentColor" class="text-primary"/>
        </svg>
      } @else {
        <svg viewBox="0 0 16 16" fill="none" class="h-4 w-4 overflow-visible">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" class="text-primary"/>
        </svg>
      }
    </span>
    <ng-content />
  `,
  host: {
    role: 'radio',
    class:
      'inline-flex items-center gap-2 text-sm font-medium leading-none select-none rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    '[class.cursor-pointer]': '!disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.opacity-50]': 'disabled()',
    '[attr.name]': 'name()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.data-state]': "checked() ? 'checked' : 'unchecked'",
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    '(click)': 'select()',
    '(keydown.enter)': 'select()',
    '(keydown.space)': 'onSpace($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZardRadioComponent), multi: true },
  ],
  exportAs: 'zRadio',
})
export class ZardRadioComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private readonly registry = inject(ZardRadioRegistry);

  readonly name = input<string>('');
  readonly value = input<string>('');
  readonly zDisabled = input(false);
  readonly class = input<ClassValue>('');

  protected readonly groupValue = signal<string | null>(null);
  protected readonly disabledState = signal(false);

  protected readonly disabled = computed(() => this.zDisabled() || this.disabledState());
  protected readonly checked = computed(() => this.groupValue() === this.value());
  protected readonly classes = computed(() => mergeClasses(radioVariants(), this.class()));

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onChange: (value: string) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _onTouched: () => void = () => {};

  ngOnInit(): void {
    this.registry.register(this);
  }

  ngOnDestroy(): void {
    this.registry.unregister(this);
  }

  select(): void {
    if (this.disabled()) return;
    this.groupValue.set(this.value());
    this._onChange(this.value());
    this._onTouched();
    this.registry.notifySelected(this);
  }

  syncGroupValue(value: string): void {
    this.groupValue.set(value);
  }

  onSpace(event: Event): void {
    event.preventDefault();
    this.select();
  }

  writeValue(value: string): void {
    this.groupValue.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledState.set(isDisabled);
  }
}

@Directive({
  selector: '[zRadioCard]',
  host: {
    '(click)': 'onCardClick($event)',
  },
})
export class ZardRadioCardDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  onCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('[z-radio]')) {
      return;
    }
    const radio: HTMLElement | null = this.elementRef.nativeElement.querySelector('[z-radio]');
    radio?.click();
  }
}
