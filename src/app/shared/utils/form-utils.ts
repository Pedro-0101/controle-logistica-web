import type { FieldState } from '@angular/forms/signals';

export function firstError(field: FieldState<unknown, string>): string {
  const errors = field.errors();
  return errors.length ? errors[0].message ?? 'Valor inválido.' : '';
}
