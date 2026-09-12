import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CompanyConfig, UpdateCompanyConfigRequest } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/company-config` da API, centralizando a gestão
 * de configurações de empresa.
 */
@Service()
export class CompanyConfigService {
  private readonly api = inject(ApiClientService);

  /** Busca a configuração da empresa informada. */
  get(companyId: string): Observable<CompanyConfig> {
    return this.api.get<CompanyConfig>(`/company-config/${companyId}`);
  }

  /** Atualiza parcialmente a configuração da empresa. */
  update(companyId: string, payload: UpdateCompanyConfigRequest): Observable<CompanyConfig> {
    return this.api.patch<CompanyConfig>(`/company-config/${companyId}`, payload);
  }
}
