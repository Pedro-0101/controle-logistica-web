import { HttpErrorResponse } from '@angular/common/http';

import type { ApiError, ApiErrorKind, ApiErrorResponse } from '@/shared/models';

const DEFAULT_MESSAGE = 'Erro inesperado ao comunicar com a API.';

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status >= 500) return 'INTERNAL';
  return 'UNKNOWN';
}

/**
 * Extrai a mensagem legível do corpo de erro da API.
 *
 * A API responde no formato padrão do NestJS (`{ statusCode, message, error }`),
 * onde `message` pode ser `string` ou `string[]` (validação). Também aceitamos o
 * envelope `{ error: { message } }` e respostas textuais.
 */
function extractMessage(body: unknown): string | null {
  if (typeof body === 'string') return body.trim() || null;
  if (!body || typeof body !== 'object') return null;

  const envelope = body as { message?: unknown; error?: unknown };

  if (typeof envelope.error === 'object' && envelope.error) {
    const nested = (envelope.error as { message?: unknown }).message;
    if (typeof nested === 'string' && nested.trim()) return nested;
  }

  if (typeof envelope.message === 'string' && envelope.message.trim()) {
    return envelope.message;
  }

  if (Array.isArray(envelope.message)) {
    const parts = envelope.message.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    if (parts.length > 0) return parts.join(' ');
  }

  if (typeof envelope.error === 'string' && envelope.error.trim()) return envelope.error;

  return null;
}

function extractKind(body: unknown): ApiErrorKind | null {
  if (!body || typeof body !== 'object') return null;
  const error = (body as Partial<ApiErrorResponse>).error;
  if (typeof error === 'object' && error && typeof error.kind === 'string') return error.kind;
  return null;
}

/**
 * Normaliza qualquer erro de rede/HTTP (incluindo `HttpErrorResponse`) para o
 * modelo `ApiError`, extraindo `kind` e `message` do corpo retornado pela API
 * quando disponível.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as unknown;
    return {
      status: error.status,
      kind: extractKind(body) ?? kindFromStatus(error.status),
      message: extractMessage(body) ?? error.message ?? DEFAULT_MESSAGE,
    };
  }

  if (error instanceof Error) {
    return { status: 0, kind: 'NETWORK', message: error.message };
  }

  return { status: 0, kind: 'NETWORK', message: DEFAULT_MESSAGE };
}
