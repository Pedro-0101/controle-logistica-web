import { ChangeDetectionStrategy, Component, computed, inject, input, ViewEncapsulation } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { ZardBreadcrumbComponent } from './breadcrumb.component';
import { breadcrumbSeparatorVariants } from './breadcrumb.variants';

@Component({
  selector: 'z-breadcrumb-separator',
  imports: [NgIcon],
  template: `
    @if (separatorIcon(); as icon) {
      <li role="presentation" aria-hidden="true" [class]="classes()">
        <ng-icon [name]="icon" />
      </li>
    } @else {
      <li role="presentation" aria-hidden="true" [class]="classes()">
        <span>{{ separatorText() }}</span>
      </li>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ZardBreadcrumbSeparatorComponent {
  private readonly breadcrumb = inject(ZardBreadcrumbComponent, { optional: true, skipSelf: true });
  readonly class = input<ClassValue>('');

  private readonly separatorMap: Record<string, string> = {
    chevron: 'lucideChevronRight',
    slash: 'lucideSlash',
  };

  protected readonly separatorIcon = computed(() => {
    const separator = this.breadcrumb?.zSeparator() ?? 'chevron';
    return this.separatorMap[separator] ?? null;
  });

  protected readonly separatorText = computed(() => {
    const separator = this.breadcrumb?.zSeparator() ?? 'chevron';
    return this.separatorMap[separator] ? '' : separator;
  });

  protected readonly classes = computed(() => mergeClasses(breadcrumbSeparatorVariants(), this.class()));
}
