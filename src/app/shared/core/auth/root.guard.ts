import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/**
 * Permite o acesso apenas ao administrador global (raiz), identificado por
 * `companyId = null`. Usuários vinculados a uma empresa são redirecionados
 * para a home.
 */
export const rootGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (session.usuario()?.companyId === null) {
    return true;
  }

  return router.createUrlTree(['/home']);
};
