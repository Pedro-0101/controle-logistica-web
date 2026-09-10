import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CreatePointRequest, Point, UpdatePointRequest } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/point` da API, centralizando a gestão de pontos de
 * controle.
 */
@Service()
export class PointService {
  private readonly api = inject(ApiClientService);

  /** Lista os pontos de controle da empresa do usuário autenticado. */
  list(): Observable<Point[]> {
    return this.api.get<Point[]>('/point');
  }

  /** Cria um novo ponto de controle. */
  create(payload: CreatePointRequest): Observable<Point> {
    return this.api.post<Point>('/point', payload);
  }

  /** Atualiza parcialmente um ponto de controle existente. */
  update(id: string, payload: UpdatePointRequest): Observable<Point> {
    return this.api.patch<Point>(`/point/${id}`, payload);
  }

  /** Remove permanentemente um ponto de controle. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/point/${id}`);
  }
}
