/** Formato de placa reconhecido pelo serviço de ANPR. */
export type AnprFormat = 'mercosul' | 'antiga';

/**
 * Caixa delimitadora da placa `[x1, y1, x2, y2]`, em pixels da imagem enviada,
 * representando os cantos superior-esquerdo e inferior-direito do retângulo.
 */
export type PlateBox = [number, number, number, number];

/** Resultado do reconhecimento ANPR (POST /anpr/reconhecer-imagem). */
export interface AnprRecognition {
  placa: string;
  formato: AnprFormat;
  confianca: number;
  raw: string;
  box?: PlateBox;
}
