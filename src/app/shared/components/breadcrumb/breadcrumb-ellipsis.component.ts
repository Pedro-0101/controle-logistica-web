import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import {
  breadcrumbEllipsisVariants,
  type ZardBreadcrumbEllipsisColor,
} from './breadcrumb.variants';

@Component({
  selector: 'z-breadcrumb-ellipsis',
  imports: [NgIcon],
  template: `
    <span [class]="classes()" role="button" tabindex="0" aria-label="More breadcrumbs">
      <ng-icon name="lucideEllipsis" />
      <span class="sr-only">More</span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ZardBreadcrumbEllipsisComponent {
  readonly zColor = input<ZardBreadcrumbEllipsisColor>('muted');
  readonly class = input<ClassValue>('');

  protected readonly classes = computed(() =>
    mergeClasses(breadcrumbEllipsisVariants({ zColor: this.zColor() }), this.class()),
  );
}
