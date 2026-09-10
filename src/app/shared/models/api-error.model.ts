/**
 * Contratos de erro retornados pela API (`ErrorResponse`) e o modelo
 * tipado `ApiError` usado pelos serviços do front-end.
 */

/** Kind de erro exposto pela API. */
export type ApiErrorKind =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'INTERNAL'
  | 'NETWORK'
  | 'UNKNOWN';

/** Corpo do erro (`ErrorBody`). */
export interface ApiErrorBody {
  kind: ApiErrorKind;
  message: string;
}

/** Envelope de erro da API (`ErrorResponse`). */
export interface ApiErrorResponse {
  error: ApiErrorBody;
}

/** Erro tipado consumido pelos serviços do front-end. */
export interface ApiError {
  status: number;
  kind: ApiErrorKind;
  message: string;
}
