import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Company } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/company` da API, centralizando a gestão de empresas.
 */
@Service()
export class CompanyService {
  private readonly api = inject(ApiClientService);

  /** Lista as empresas visíveis para o usuário autenticado. */
  list(): Observable<Company[]> {
    return this.api.get<Company[]>('/company');
  }
}
