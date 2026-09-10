import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import type { ClassValue } from 'clsx';
import { NgxSonnerToaster } from 'ngx-sonner';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { toastVariants, type ZardToastVariants } from './toast.variants';

@Component({
  selector: 'z-toaster',
  imports: [NgxSonnerToaster],
  template: `
    <ngx-sonner-toaster
      [class]="classes()"
      [position]="zPosition()"
      [richColors]="zRichColors()"
      [expand]="zExpand()"
      [duration]="zDuration()"
      [visibleToasts]="zVisibleToasts()"
      [closeButton]="zCloseButton()"
      [toastOptions]="zToastOptions()"
      [dir]="zDir()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  exportAs: 'zToast',
})
export class ZardToastComponent {
  readonly class = input<ClassValue>('');

  readonly zVariant = input<ZardToastVariants>('default');
  readonly zPosition = input<
    'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  >('bottom-right');
  readonly zRichColors = input<boolean>(false);
  readonly zExpand = input<boolean>(false);
  readonly zDuration = input<number>(4000);
  readonly zVisibleToasts = input<number>(3);
  readonly zCloseButton = input<boolean>(false);
  readonly zToastOptions = input<Record<string, unknown>>({});
  readonly zDir = input<'ltr' | 'rtl' | 'auto'>('auto');

  protected readonly classes = computed(() =>
    mergeClasses('toaster group', toastVariants({ zVariant: this.zVariant() }), this.class()),
  );
}
