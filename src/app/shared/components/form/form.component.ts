import { Component, computed, input, ViewEncapsulation } from '@angular/core';

import { mergeClasses } from '@/shared/utils/merge-classes';

@Component({
  selector: 'z-form-field',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'block space-y-2' },
  exportAs: 'zFormField',
})
export class ZardFormFieldComponent {}

@Component({
  selector: 'z-form-label',
  template: `
    <ng-content />
    @if (zRequired()) {
      <span class="text-destructive ml-0.5">*</span>
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  },
  exportAs: 'zFormLabel',
})
export class ZardFormLabelComponent {
  readonly zRequired = input(false);
}

@Component({
  selector: 'z-form-control',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'block pt-1' },
  exportAs: 'zFormControl',
})
export class ZardFormControlComponent {}

@Component({
  selector: 'z-form-message',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zFormMessage',
})
export class ZardFormMessageComponent {
  readonly zError = input(false);

  protected readonly classes = computed(() =>
    mergeClasses('block text-sm', this.zError() ? 'text-destructive' : 'text-muted-foreground'),
  );
}

@Component({
  selector: 'z-form-description',
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': 'block text-sm text-muted-foreground' },
  exportAs: 'zFormDescription',
})
export class ZardFormDescriptionComponent {}
