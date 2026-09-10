import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import {
  breadcrumbVariants,
  type ZardBreadcrumbAlign,
  type ZardBreadcrumbSize,
  type ZardBreadcrumbWrap,
} from './breadcrumb.variants';

@Component({
  selector: 'z-breadcrumb, nav[z-breadcrumb]',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'navigation',
    '[attr.aria-label]': '"breadcrumb"',
    '[class]': 'classes()',
  },
  exportAs: 'zBreadcrumb',
})
export class ZardBreadcrumbComponent {
  readonly zSize = input<ZardBreadcrumbSize>('md');
  readonly zAlign = input<ZardBreadcrumbAlign>('start');
  readonly zWrap = input<ZardBreadcrumbWrap>('wrap');
  readonly zSeparator = input<string>('chevron');
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(
      breadcrumbVariants({
        zSize: this.zSize(),
        zAlign: this.zAlign(),
        zWrap: this.zWrap(),
      }),
      this.class(),
    ),
  );
}
