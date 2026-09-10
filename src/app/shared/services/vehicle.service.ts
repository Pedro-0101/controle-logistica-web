import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CreateVehicleRequest, UpdateVehicleRequest, Vehicle } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/vehicle` da API, centralizando a gestão de veículos.
 */
@Service()
export class VehicleService {
  private readonly api = inject(ApiClientService);

  /** Lista os veículos visíveis para o usuário autenticado. */
  list(): Observable<Vehicle[]> {
    return this.api.get<Vehicle[]>('/vehicle');
  }

  /** Cria um novo veículo. */
  create(payload: CreateVehicleRequest): Observable<Vehicle> {
    return this.api.post<Vehicle>('/vehicle', payload);
  }

  /** Atualiza parcialmente um veículo existente. */
  update(id: string, payload: UpdateVehicleRequest): Observable<Vehicle> {
    return this.api.patch<Vehicle>(`/vehicle/${id}`, payload);
  }

  /** Remove permanentemente um veículo. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/vehicle/${id}`);
  }
}
