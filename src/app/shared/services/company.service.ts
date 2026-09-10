import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Company, CreateCompanyRequest, CreateCompanyResponse, UpdateCompanyRequest } from '@/shared/models';
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

  /** Cria uma nova empresa junto com seu usuário administrador. */
  create(payload: CreateCompanyRequest): Observable<CreateCompanyResponse> {
    return this.api.post<CreateCompanyResponse>('/company', payload);
  }

  /** Atualiza parcialmente uma empresa existente. */
  update(id: string, payload: UpdateCompanyRequest): Observable<Company> {
    return this.api.patch<Company>(`/company/${id}`, payload);
  }

  /** Remove permanentemente uma empresa. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/company/${id}`);
  }
}
