import { Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { buttonVariants, type ZardButtonSizeVariants, type ZardButtonTypeVariants } from './button.variants';

@Component({
  selector: 'button[z-button], a[z-button]',
  template: `
    @if (zLoading()) {
      <svg class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    }
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'disabled() ? "" : null',
  },
  exportAs: 'zButton',
})
export class ZardButtonComponent {
  readonly zType = input<ZardButtonTypeVariants>('default');
  readonly zSize = input<ZardButtonSizeVariants>('default');
  readonly zDisabled = input<boolean>(false);
  readonly zFull = input<boolean>(false);
  readonly zLoading = input<boolean>(false);
  readonly class = input<ClassValue>('');

  protected readonly disabled = computed(() => this.zDisabled() || this.zLoading());

  protected readonly classes = computed(() =>
    mergeClasses(
      buttonVariants({
        zType: this.zType(),
        zSize: this.zSize(),
        zFull: this.zFull(),
      }),
      this.class(),
    ),
  );
}
