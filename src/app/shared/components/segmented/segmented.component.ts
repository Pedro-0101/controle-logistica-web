import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { segmentedVariants, segmentItemVariants } from './segmented.variants';
import type { ZardSegmentedSizeVariants } from './segmented.variants';

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'z-segmented',
  template: `
    <div
      role="radiogroup"
      [class]="classes()"
      [attr.aria-label]="zAriaLabel()"
    >
      @for (option of zOptions(); track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="value() === option.value"
          [attr.aria-disabled]="isOptionDisabled(option)"
          [attr.data-state]="value() === option.value ? 'active' : 'inactive'"
          [class]="itemClasses()"
          [disabled]="isOptionDisabled(option)"
          (click)="select(option)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'zSegmented',
})
export class ZardSegmentedComponent implements OnInit {
  readonly zSize = input<ZardSegmentedSizeVariants>('default');
  readonly zOptions = input<SegmentedOption[]>([]);
  readonly zDefaultValue = input<string>('');
  readonly zDisabled = input<boolean>(false);
  readonly zAriaLabel = input<string>('Segmented control');
  readonly class = input<ClassValue>('');

  readonly zChange = output<string>();

  protected readonly value = signal<string>('');

  protected readonly itemClasses = computed(() => segmentItemVariants({ zSize: this.zSize() }));

  protected readonly classes = computed(() => mergeClasses(segmentedVariants({ zSize: this.zSize() }), this.class()));

  ngOnInit(): void {
    if (this.zDefaultValue()) {
      this.value.set(this.zDefaultValue());
    }
  }

  protected isOptionDisabled(option: SegmentedOption): boolean {
    return this.zDisabled() || option.disabled === true;
  }

  protected select(option: SegmentedOption): void {
    if (this.isOptionDisabled(option)) return;
    this.value.set(option.value);
    this.zChange.emit(option.value);
  }
}
