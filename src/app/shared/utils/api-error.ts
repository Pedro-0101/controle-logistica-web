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
 * Normaliza qualquer erro de rede/HTTP (incluindo `HttpErrorResponse`) para o
 * modelo `ApiError`, extraindo `kind` e `message` do envelope `ErrorResponse`
 * retornado pela API quando disponível.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorResponse | null | undefined;
    return {
      status: error.status,
      kind: body?.error?.kind ?? kindFromStatus(error.status),
      message: body?.error?.message ?? error.message ?? DEFAULT_MESSAGE,
    };
  }

  if (error instanceof Error) {
    return { status: 0, kind: 'NETWORK', message: error.message };
  }

  return { status: 0, kind: 'NETWORK', message: DEFAULT_MESSAGE };
}
