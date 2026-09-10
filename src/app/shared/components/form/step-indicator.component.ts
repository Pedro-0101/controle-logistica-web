import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'z-step-indicator',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      fill="none"
      class="block shrink-0"
    >
      @if (complete()) {
        <circle cx="16" cy="16" r="15" fill="var(--color-primary)" />
        <path
          d="M9 16l5 5 9-9"
          stroke="var(--color-primary-foreground)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      } @else if (active()) {
        <circle cx="16" cy="16" r="15" fill="var(--color-primary)" />
        <text
          x="16"
          y="16.5"
          text-anchor="middle"
          dominant-baseline="central"
          fill="var(--color-primary-foreground)"
          font-size="14"
          font-weight="500"
        >{{ stepNumber() }}</text>
      } @else {
        <circle cx="16" cy="16" r="14.5" stroke="var(--color-muted-foreground)" stroke-width="1.5" />
        <text
          x="16"
          y="16.5"
          text-anchor="middle"
          dominant-baseline="central"
          fill="var(--color-muted-foreground)"
          font-size="14"
          font-weight="500"
        >{{ stepNumber() }}</text>
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'inline-flex items-center justify-center' },
  exportAs: 'zStepIndicator',
})
export class ZardStepIndicatorComponent {
  readonly stepNumber = input.required<number>();
  readonly size = input(32);
  readonly active = input(false);
  readonly complete = input(false);
}
