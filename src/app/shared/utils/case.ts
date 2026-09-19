/**
 * Utilitários puros de normalização de caixa (case) para textos de formulários.
 *
 * São a única fonte de verdade das transformações: os pipes de exibição
 * (`titleCase`, `upperCase`, `sentenceCase`) e a diretiva de input `zCase`
 * reutilizam estas funções para manter o comportamento consistente.
 */

/**
 * Partículas que permanecem minúsculas no meio de nomes próprios,
 * exceto quando aparecem como a primeira palavra.
 */
const NAME_PARTICLES = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'di',
  'du',
  'del',
  'della',
  'van',
  'von',
  'la',
  'le',
  'los',
  'las',
  'y',
]);

/**
 * Converte um texto para title case (primeira letra de cada palavra em
 * maiúscula), mantendo minúsculas as partículas de nomes próprios.
 *
 * @example
 * toTitleCase('joão DA silva') // "João da Silva"
 */
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && NAME_PARTICLES.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Converte um texto para caixa alta (maiúsculas). Indicado para códigos,
 * prefixos e placas.
 *
 * @example
 * toUpperCase('ua-001') // "UA-001"
 */
export function toUpperCase(value: string | null | undefined): string {
  if (!value) return '';

  return value.toUpperCase();
}

/**
 * Converte um texto para "sentence case": apenas a primeira letra fica
 * maiúscula, preservando o restante exatamente como digitado. Indicado para
 * campos de texto livre (endereço, motivo, observações).
 *
 * @example
 * toSentenceCase('rua principal, 123') // "Rua principal, 123"
 */
export function toSentenceCase(value: string | null | undefined): string {
  if (!value) return '';

  const withoutLeadingSpaces = value.replace(/^\s+/, '');
  if (!withoutLeadingSpaces) return '';

  return withoutLeadingSpaces.charAt(0).toUpperCase() + withoutLeadingSpaces.slice(1);
}
