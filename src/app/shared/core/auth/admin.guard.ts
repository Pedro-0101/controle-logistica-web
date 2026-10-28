import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/**
 * Permite o acesso apenas a usuários com a função `admin`.
 *
 * Aguarda o carregamento da sessão para não decidir com dados ainda ausentes.
 * Usuários sem a função são redirecionados para a home.
 */
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (!(await session.carregar())) {
    return router.createUrlTree(['/login']);
  }

  if (session.usuario()?.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/home']);
};
