import { Pipe, PipeTransform } from '@angular/core';

import { toUpperCase } from '@/shared/utils/case';

/**
 * Converte uma string para caixa alta. Indicado para códigos, prefixos e
 * placas.
 *
 * @example
 * {{ 'ua-001' | upperCase }}  // "UA-001"
 */
@Pipe({
  name: 'upperCase',
})
export class UpperCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return toUpperCase(value);
  }
}
