import { Pipe, PipeTransform } from '@angular/core';

/**
 * Converte uma string para title case, capitalizando a primeira letra de
 * cada palavra e deixando as demais minúsculas.
 *
 * @example
 * {{ 'joão da silva' | titleCase }}  // "João Da Silva"
 */
@Pipe({
  name: 'titleCase',
})
export class TitleCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    return value.toLowerCase().replace(/(^|\s)\S/g, (match) => match.toUpperCase());
  }
}
