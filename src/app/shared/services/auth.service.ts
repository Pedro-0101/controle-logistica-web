import { Service, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import type { LoginRequest, LoginResponse, LoginResult, MeResponse, User } from '@/shared/models';
import { ApiClientService } from './api-client.service';
import { AuthTokenService } from './auth-token.service';

@Service()
export class AuthService {
  private readonly api = inject(ApiClientService);
  private readonly tokenService = inject(AuthTokenService);

  /**
   * Autentica o usuário e armazena o token retornado.
   *
   * @param remember Quando `true` o token é persistido em `localStorage`;
   * caso contrário, fica apenas na sessão da aba.
   */
  login(credentials: LoginRequest, remember = true): Observable<LoginResult> {
    return this.api.post<LoginResponse>('/auth/login', credentials).pipe(
      map((response) => ({
        token: response.access_token,
        user: { ...response.user, company: response.company },
      })),
      tap((result) => {
        this.tokenService.setToken(result.token, remember);
        this.tokenService.saveRememberedUser(
          remember ? { name: result.user.name ?? '', email: result.user.email } : null,
        );
      }),
    );
  }

  /** Retorna os dados do usuário autenticado com base no token atual. */
  me(): Observable<User> {
    return this.api.get<MeResponse>('/auth/me').pipe(
      map((response) => ({
        id: response.userId,
        email: response.email,
        role: response.role,
        companyId: response.companyId,
        company: response.company,
      })),
    );
  }

  /** Encerra a sessão removendo o token armazenado. */
  logout(): void {
    this.tokenService.clear();
  }
}
