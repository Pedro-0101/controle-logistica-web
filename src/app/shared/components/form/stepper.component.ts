import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { ZardStepIndicatorComponent } from './step-indicator.component';

@Component({
  selector: 'z-form-stepper',
  imports: [ZardStepIndicatorComponent],
  template: `
    <nav class="flex items-center justify-center gap-0 mb-8">
      @for (step of steps(); track step; let i = $index) {
        <div class="flex items-center">
          <button
            type="button"
            class="flex items-center gap-2 group cursor-default"
            [class.cursor-pointer]="i < currentStep() && !zLinear()"
            [attr.aria-current]="i === currentStep() ? 'step' : undefined"
            [attr.aria-disabled]="i > currentStep() || null"
            (click)="onStepClick(i)"
          >
            <z-step-indicator
              [stepNumber]="i + 1"
              [active]="i === currentStep()"
              [complete]="i < currentStep()"
            />
            <span
              class="text-sm hidden sm:inline"
              [class.text-foreground]="i <= currentStep()"
              [class.font-medium]="i === currentStep()"
              [class.text-muted-foreground]="i > currentStep()"
            >{{ step }}</span>
          </button>
          @if (i < steps().length - 1) {
            <div
              class="w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 transition-colors"
              [class.bg-primary]="i < currentStep()"
              [class.bg-muted]="i >= currentStep()"
            ></div>
          }
        </div>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'block' },
  exportAs: 'zFormStepper',
})
export class ZardFormStepperComponent {
  readonly steps = input.required<string[]>();
  readonly currentStep = input.required<number>();
  readonly zLinear = input(false);
  readonly stepChange = output<number>();

  onStepClick(index: number): void {
    if (!this.zLinear() && index < this.currentStep()) {
      this.stepChange.emit(index);
    }
  }
}
