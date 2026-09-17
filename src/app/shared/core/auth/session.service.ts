import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { User } from '@/shared/models';
import { LoggerService } from '@/shared/services/logger.service';
import { AuthService } from '@/shared/services/auth.service';
import { AuthTokenService } from '@/shared/services/auth-token.service';

/**
 * Estado de sessão do usuário autenticado.
 *
 * Mantém o usuário atual como signal reativo e centraliza carregamento/logout
 * da sessão.
 */
@Service()
export class SessionService {
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(AuthTokenService);
  private readonly logger = inject(LoggerService).create('SessionService');

  private readonly _usuario = signal<User | null>(null);

  /** Usuário autenticado (ou `null` quando deslogado). */
  readonly usuario = this._usuario.asReadonly();

  /** `true` quando há um usuário autenticado em memória. */
  readonly isAuthenticated = computed(() => this._usuario() !== null);

  private carregando: Promise<boolean> | null = null;

  /** Define (ou limpa) o usuário logado. */
  defineUsuario(usuario: User | null): void {
    this._usuario.set(usuario);
    this.logger.info(usuario ? 'Usuário definido' : 'Sessão limpa', this.descreverUsuario(usuario));
  }

  /**
   * Carrega o usuário a partir do token atual (via `/auth/me`).
   *
   * Evita requisições duplicadas em caso de chamadas concorrentes. Retorna
   * `true` quando a sessão foi estabelecida.
   */
  async carregar(): Promise<boolean> {
    if (this._usuario()) {
      this.logger.debug('Sessão já carregada', this.descreverUsuario(this._usuario()));
      return true;
    }
    if (this.carregando) {
      this.logger.debug('Carregamento de sessão em andamento');
      return this.carregando;
    }

    this.logger.info('Carregando usuário via /auth/me');
    this.carregando = (async () => {
      try {
        const usuario = await firstValueFrom(this.authService.me());
        this._usuario.set(this.comNomePersistido(usuario));
        this.logger.info('Usuário carregado', this.descreverUsuario(this._usuario()));
        return true;
      } catch (error) {
        this.logger.error('Falha ao carregar usuário', error);
        return false;
      } finally {
        this.carregando = null;
      }
    })();

    return this.carregando;
  }

  /** Encerra a sessão, limpando usuário e token. */
  logout(): void {
    this.logger.info('Encerrando sessão', this.descreverUsuario(this._usuario()));
    this._usuario.set(null);
    this.authService.logout();
  }

  /**
   * Completa o usuário com o nome salvo via "lembrar de mim" quando o
   * `/auth/me` não o retorna, evitando que o header exiba o e-mail no lugar
   * do nome após restaurar a sessão.
   */
  private comNomePersistido(usuario: User): User {
    if (usuario.name) return usuario;

    const nomeSalvo = this.tokenService.rememberedUser()?.name;
    return nomeSalvo ? { ...usuario, name: nomeSalvo } : usuario;
  }

  private descreverUsuario(usuario: User | null): unknown {
    if (!usuario) return undefined;
    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      companyId: usuario.companyId,
    };
  }
}
