import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { loaderVariants, type ZardLoaderSizeVariants } from './loader.variants';

@Component({
  selector: 'z-loader',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    'role': 'status',
  },
  exportAs: 'zLoader',
})
export class ZardLoaderComponent {
  readonly zSize = input<ZardLoaderSizeVariants>('default');
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(loaderVariants({ zSize: this.zSize() }), this.class()),
  );
}
