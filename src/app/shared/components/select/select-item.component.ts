import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, ViewEncapsulation } from '@angular/core';
import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';
import { ZardSelectComponent } from './select.component';

@Component({
  selector: 'z-select-item',
  template: `
    @if (parentSelect?.zMultiple()) {
      <svg
        class="size-4 shrink-0"
        [class.opacity-0]="!active()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    }
    <span class="flex-1 truncate"><ng-content /></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'option',
    '[attr.data-value]': 'zValue()',
    '[attr.data-disabled]': 'zDisabled() || null',
    '[attr.aria-selected]': 'active()',
    '[class]': 'classes()',
    '(click)': 'onSelect()',
  },
})
export class ZardSelectItemComponent {
  readonly zValue = input<string>('');
  readonly zDisabled = input<boolean>(false);
  readonly class = input<ClassValue>('');

  private readonly elementRef = inject(ElementRef);
  protected readonly parentSelect = inject(ZardSelectComponent, { optional: true });

  protected readonly active = computed(() => {
    if (!this.parentSelect) return false;
    const value = this.parentSelect.zValue();
    if (this.parentSelect.zMultiple()) {
      return Array.isArray(value) && value.includes(this.zValue());
    }
    return value === this.zValue();
  });

  protected readonly classes = computed(() =>
    mergeClasses(
      'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md py-1.5 px-3 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      this.active() ? 'bg-accent text-accent-foreground' : 'text-popover-foreground',
      this.class(),
    ),
  );

  getLabel(): string {
    return this.elementRef.nativeElement.textContent?.trim() || '';
  }

  protected onSelect(): void {
    if (this.zDisabled()) return;
    this.parentSelect?.selectValue(this.zValue());
  }
}
