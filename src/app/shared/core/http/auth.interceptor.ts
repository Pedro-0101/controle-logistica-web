import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthTokenService } from '@/shared/services/auth-token.service';

const AUTH_HEADER = 'Authorization';

/**
 * Anexa o token JWT no header `Authorization` de toda requisição autenticada.
 *
 * A API de controle logístico segue o padrão HTTP Bearer, portanto o token é
 * prefixado com `Bearer `.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthTokenService).accessToken();
  if (!token || request.headers.has(AUTH_HEADER)) return next(request);
  return next(request.clone({ setHeaders: { [AUTH_HEADER]: `Bearer ${token}` } }));
};
