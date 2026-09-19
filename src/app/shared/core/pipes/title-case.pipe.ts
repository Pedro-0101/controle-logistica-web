import { Pipe, PipeTransform } from '@angular/core';

import { toTitleCase } from '@/shared/utils/case';

/**
 * Converte uma string para title case, capitalizando a primeira letra de
 * cada palavra e mantendo minúsculas as partículas de nomes próprios.
 *
 * @example
 * {{ 'joão da silva' | titleCase }}  // "João da Silva"
 */
@Pipe({
  name: 'titleCase',
})
export class TitleCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return toTitleCase(value);
  }
}
