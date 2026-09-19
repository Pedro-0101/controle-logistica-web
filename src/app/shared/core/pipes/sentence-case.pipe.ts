import { Pipe, PipeTransform } from '@angular/core';

import { toSentenceCase } from '@/shared/utils/case';

/**
 * Converte uma string para "sentence case": apenas a primeira letra fica
 * maiúscula, preservando o restante como digitado. Indicado para campos de
 * texto livre (endereço, motivo, observações).
 *
 * @example
 * {{ 'rua principal, 123' | sentenceCase }}  // "Rua principal, 123"
 */
@Pipe({
  name: 'sentenceCase',
})
export class SentenceCasePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return toSentenceCase(value);
  }
}
