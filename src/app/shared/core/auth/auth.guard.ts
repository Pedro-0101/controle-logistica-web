import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { LoggerService } from '@/shared/services/logger.service';
import { AuthTokenService } from '@/shared/services/auth-token.service';

import { SessionService } from './session.service';

/**
 * Permite o acesso apenas a usuários autenticados.
 *
 * Sem token, redireciona para `/login`. Com token, garante que o usuário foi
 * carregado antes de liberar a rota; se o token for inválido/vencido, limpa a
 * sessão e redireciona para o login.
 */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const tokenService = inject(AuthTokenService);
  const session = inject(SessionService);
  const logger = inject(LoggerService).create('AuthGuard');

  if (!tokenService.accessToken()) {
    logger.warn('Acesso negado: usuário sem token', { destino: '/login' });
    return router.createUrlTree(['/login']);
  }

  if (session.usuario()) {
    logger.debug('Acesso liberado: sessão já carregada', { usuarioID: session.usuario()?.id });
    return true;
  }

  if (!(await session.carregar())) {
    logger.warn('Acesso negado: token inválido ou expirado', { destino: '/login' });
    session.logout();
    return router.createUrlTree(['/login']);
  }

  logger.info('Acesso liberado', { usuarioID: session.usuario()?.id });
  return true;
};
