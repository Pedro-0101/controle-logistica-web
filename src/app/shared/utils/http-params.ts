import { HttpParams } from '@angular/common/http';

import type { HttpQuery } from '@/shared/models';

/**
 * Converte um mapa de filtros em `HttpParams`, ignorando valores vazios
 * (`undefined`, `null` e strings vazias) para não enviá-los à API.
 */
export function toHttpParams(params?: HttpQuery | HttpParams | null): HttpParams {
  if (!params) return new HttpParams();
  if (params instanceof HttpParams) return params;

  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}
