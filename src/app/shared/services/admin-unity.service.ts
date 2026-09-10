import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AdminUnity, CreateAdminUnityRequest, UpdateAdminUnityRequest } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/admin-unity` da API, centralizando a gestão de
 * unidades administrativas.
 */
@Service()
export class AdminUnityService {
  private readonly api = inject(ApiClientService);

  /** Lista as unidades administrativas da empresa do usuário autenticado. */
  list(): Observable<AdminUnity[]> {
    return this.api.get<AdminUnity[]>('/admin-unity');
  }

  /** Cria uma nova unidade administrativa. */
  create(payload: CreateAdminUnityRequest): Observable<AdminUnity> {
    return this.api.post<AdminUnity>('/admin-unity', payload);
  }

  /** Atualiza parcialmente uma unidade administrativa existente. */
  update(id: string, payload: UpdateAdminUnityRequest): Observable<AdminUnity> {
    return this.api.patch<AdminUnity>(`/admin-unity/${id}`, payload);
  }

  /** Remove permanentemente uma unidade administrativa. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/admin-unity/${id}`);
  }
}
