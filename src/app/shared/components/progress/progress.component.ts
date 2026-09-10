import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: 'z-progress',
  template: `
    <div class="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" [attr.aria-valuenow]="value()" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full bg-primary transition-all duration-300 ease-in-out" [style.width.%]="value()"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  exportAs: 'zProgress',
})
export class ZardProgressComponent {
  readonly value = input(0);
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() => mergeClasses('w-full', this.class()));
}
