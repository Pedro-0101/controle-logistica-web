import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: 'z-breadcrumb-item',
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #content>
      <ng-content />
    </ng-template>
    @if (routerLink(); as link) {
      <a [routerLink]="link" [class]="classes()">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <span role="link" aria-disabled="true" aria-current="page" [class]="classes()">
        <ng-container [ngTemplateOutlet]="content" />
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ZardBreadcrumbItemComponent {
  readonly routerLink = input<RouterLink['routerLink']>();
  readonly class = input<ClassValue>('');

  protected readonly isLink = computed(() => !!this.routerLink());

  protected readonly classes = computed(() =>
    mergeClasses(
      'inline-flex items-center gap-1.5 [&>ng-icon]:size-3.5 [&>svg]:size-3.5',
      this.isLink()
        ? 'hover:text-foreground transition-colors cursor-pointer'
        : 'text-foreground font-medium',
      this.class(),
    ),
  );
}
