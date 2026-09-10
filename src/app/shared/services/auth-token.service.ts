import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';

const PERSISTENT_TOKEN_KEY = 'clw-access-token';
const SESSION_TOKEN_KEY = 'clw-access-token-session';
const REMEMBERED_USER_KEY = 'clw-remembered-user';

/** Conta persistida no dispositivo via "lembrar de mim". */
export interface RememberedUser {
  name: string;
  email: string;
}

/**
 * Guarda o token JWT de acesso, expondo-o como signal reativo.
 *
 * Quando "lembrar de mim" está ativo, o token é persistido em `localStorage`
 * (sobrevive a recarregamentos e reaberturas do navegador). Caso contrário, é
 * mantido apenas em `sessionStorage`, encerrando a sessão ao fechar a aba.
 */
@Service()
export class AuthTokenService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _accessToken = signal<string | null>(this.readStoredToken());
  private readonly _rememberedUser = signal<RememberedUser | null>(this.readRememberedUser());

  /** Token JWT atual (somente leitura). */
  readonly accessToken = this._accessToken.asReadonly();

  /** `true` quando existe um token de acesso válido em memória. */
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  /** Conta salva no dispositivo via "lembrar de mim", quando houver. */
  readonly rememberedUser = this._rememberedUser.asReadonly();

  setToken(token: string | null, remember = true): void {
    this._accessToken.set(token);
    this.persist(token, remember);
  }

  /** Persiste ou remove a conta lembrada junto do token persistente. */
  saveRememberedUser(user: RememberedUser | null): void {
    this._rememberedUser.set(user);
    if (!isPlatformBrowser(this.platformId)) return;

    if (user) {
      localStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(REMEMBERED_USER_KEY);
    }
  }

  clear(): void {
    this.setToken(null);
    this.saveRememberedUser(null);
  }

  private readStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(PERSISTENT_TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  private readRememberedUser(): RememberedUser | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    try {
      const raw = localStorage.getItem(REMEMBERED_USER_KEY);
      return raw ? (JSON.parse(raw) as RememberedUser) : null;
    } catch {
      localStorage.removeItem(REMEMBERED_USER_KEY);
      return null;
    }
  }

  private persist(token: string | null, remember: boolean): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!token) {
      localStorage.removeItem(PERSISTENT_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }

    if (remember) {
      localStorage.setItem(PERSISTENT_TOKEN_KEY, token);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } else {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.removeItem(PERSISTENT_TOKEN_KEY);
    }
  }
}
