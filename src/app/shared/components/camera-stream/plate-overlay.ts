import type { PlateBox } from '@/shared/models';

/**
 * Mapeamento e desenho do contorno da placa sobre o vídeo ao vivo.
 *
 * O `box` retornado pelo ANPR é relativo à resolução intrínseca do vídeo
 * (`videoWidth`×`videoHeight`). Como o `<video>` é exibido com `object-fit`
 * (`contain`/`cover`), é preciso compensar escala e offset (letterbox/crop)
 * antes de desenhar no canvas sobreposto.
 */

/** Modo de ajuste do vídeo no seu contêiner. */
export type ObjectFit = 'contain' | 'cover';

/** Retângulo em coordenadas do elemento exibido. */
export interface DisplayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Estilos do overlay desenhado no canvas. */
export interface PlateOverlayStyle {
  strokeColor: string;
  lineWidth: number;
  labelBackground: string;
  labelColor: string;
  font: string;
}

export const DEFAULT_PLATE_STYLE: PlateOverlayStyle = {
  strokeColor: '#22c55e',
  lineWidth: 3,
  labelBackground: 'rgba(0, 0, 0, 0.72)',
  labelColor: '#ffffff',
  font: '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
};

/**
 * Calcula a área efetivamente ocupada pelo conteúdo dentro do contêiner,
 * considerando o `object-fit` (escala + offset centralizado).
 */
export function computeContentRect(
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  fit: ObjectFit,
): DisplayRect {
  if (!containerWidth || !containerHeight || !contentWidth || !contentHeight) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale =
    fit === 'cover'
      ? Math.max(containerWidth / contentWidth, containerHeight / contentHeight)
      : Math.min(containerWidth / contentWidth, containerHeight / contentHeight);

  const width = contentWidth * scale;
  const height = contentHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Converte o `box` (em pixels do vídeo) para coordenadas do elemento exibido,
 * aplicando a mesma escala/offset do `object-fit`.
 */
export function mapPlateBox(
  box: PlateBox,
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  fit: ObjectFit,
): DisplayRect {
  const content = computeContentRect(
    containerWidth,
    containerHeight,
    videoWidth,
    videoHeight,
    fit,
  );
  const scaleX = content.width / videoWidth;
  const scaleY = content.height / videoHeight;
  const [x1, y1, x2, y2] = box;

  return {
    x: content.x + x1 * scaleX,
    y: content.y + y1 * scaleY,
    width: (x2 - x1) * scaleX,
    height: (y2 - y1) * scaleY,
  };
}

/**
 * Desenha o retângulo e o rótulo da placa no contexto 2D do canvas de overlay.
 */
export function drawPlateOverlay(
  ctx: CanvasRenderingContext2D,
  rect: DisplayRect,
  placa: string,
  containerWidth: number,
  containerHeight: number,
  style: PlateOverlayStyle = DEFAULT_PLATE_STYLE,
): void {
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  ctx.save();

  ctx.strokeStyle = style.strokeColor;
  ctx.lineWidth = style.lineWidth;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

  if (placa) {
    const paddingX = 6;
    const labelHeight = 20;
    ctx.font = style.font;
    const labelWidth = ctx.measureText(placa).width + paddingX * 2;

    const preferredY = rect.y - labelHeight - 4;
    const labelY = preferredY >= 0 ? preferredY : rect.y + rect.height + 4;
    const labelX = clamp(rect.x, 0, Math.max(0, containerWidth - labelWidth));

    ctx.fillStyle = style.labelBackground;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

    ctx.fillStyle = style.labelColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(placa, labelX + paddingX, labelY + labelHeight / 2 + 1);
  }

  ctx.restore();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
