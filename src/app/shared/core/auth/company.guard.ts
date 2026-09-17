import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from './session.service';

/**
 * Permite o acesso apenas a usuários vinculados a uma empresa.
 *
 * O administrador global (raiz), identificado por `companyId = null`, não tem
 * contexto de filial e é redirecionado para a gestão de empresas — sua tela
 * principal.
 *
 * Assim como o `authGuard`, aguarda o carregamento da sessão: os guards de uma
 * mesma rota são executados em paralelo, então este precisa esperar o usuário
 * estar disponível antes de decidir (mesma promise é reaproveitada).
 */
export const companyGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(SessionService);

  if (!(await session.carregar())) {
    return router.createUrlTree(['/login']);
  }

  if (session.usuario()?.companyId === null) {
    return router.createUrlTree(['/empresas']);
  }

  return true;
};
