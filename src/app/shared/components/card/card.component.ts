import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '@/shared/utils/merge-classes';
import { cardVariants } from './card.variants';

@Component({
  selector: 'z-card, [z-card]',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  exportAs: 'zCard',
})
export class ZardCardComponent {
  readonly zType = input<'default' | 'interactive'>('default');
  readonly class = input<ClassValue>('');
  protected readonly classes = computed(() => mergeClasses(cardVariants({ zType: this.zType() }), this.class()));
}
