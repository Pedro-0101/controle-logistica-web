import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { HttpQuery } from '@/shared/models';
import { toApiError } from '@/shared/utils/api-error';
import { toHttpParams } from '@/shared/utils/http-params';

export interface ApiRequestOptions {
  params?: HttpQuery | HttpParams;
}

type RequestOptions = { params: HttpParams };

/**
 * Cliente HTTP central da aplicação.
 *
 * Centraliza a URL base (via `environment`) e converte qualquer erro de
 * rede/HTTP para o modelo tipado `ApiError`.
 */
@Service()
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, options?: ApiRequestOptions): Observable<T> {
    return this.http
      .get<T>(this.url(path), this.toOptions(options))
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, this.toOptions(options))
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http
      .put<T>(this.url(path), body, this.toOptions(options))
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http
      .patch<T>(this.url(path), body, this.toOptions(options))
      .pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
  }

  delete(path: string, options?: ApiRequestOptions): Observable<void> {
    return this.http
      .delete<unknown>(this.url(path), this.toOptions(options))
      .pipe(
        map(() => undefined),
        catchError((error: unknown) => throwError(() => toApiError(error))),
      );
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private toOptions(options?: ApiRequestOptions): RequestOptions {
    return { params: toHttpParams(options?.params) };
  }
}
