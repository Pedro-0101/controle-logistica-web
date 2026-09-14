import { signal } from '@angular/core';

export interface StepNavigation {
  currentStep: ReturnType<typeof signal<number>>;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (index: number) => void;
}

export function createStepNavigation(totalSteps: number): StepNavigation {
  const currentStep = signal(0);

  return {
    currentStep,

    nextStep() {
      if (currentStep() < totalSteps - 1) {
        currentStep.update((s) => s + 1);
      }
    },

    previousStep() {
      if (currentStep() > 0) {
        currentStep.update((s) => s - 1);
      }
    },

    goToStep(index: number) {
      currentStep.set(index);
    },
  };
}
