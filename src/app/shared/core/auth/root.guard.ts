import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/**
 * Permite o acesso apenas ao administrador global (raiz), identificado por
 * `companyId = null`. Usuários vinculados a uma empresa são redirecionados
 * para a home.
 *
 * Aguarda o carregamento da sessão para não decidir com dados ainda ausentes
 * (os guards de uma mesma rota são executados em paralelo).
 */
export const rootGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (!(await session.carregar())) {
    return router.createUrlTree(['/login']);
  }

  if (session.usuario()?.companyId === null) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
