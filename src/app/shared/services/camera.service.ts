import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Camera, CreateCameraRequest, UpdateCameraRequest } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/camera` da API, centralizando a gestão de câmeras IP.
 */
@Service()
export class CameraService {
  private readonly api = inject(ApiClientService);

  /** Lista as câmeras visíveis para o usuário autenticado. */
  list(): Observable<Camera[]> {
    return this.api.get<Camera[]>('/camera');
  }

  /** Cria uma nova câmera. */
  create(payload: CreateCameraRequest): Observable<Camera> {
    return this.api.post<Camera>('/camera', payload);
  }

  /** Atualiza parcialmente uma câmera existente. */
  update(id: string, payload: UpdateCameraRequest): Observable<Camera> {
    return this.api.patch<Camera>(`/camera/${id}`, payload);
  }

  /** Remove permanentemente uma câmera. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/camera/${id}`);
  }
}
