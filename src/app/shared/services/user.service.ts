import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CreateUserRequest, ManagedUser, Point, UpdateUserRequest } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/user` da API, centralizando a gestão de usuários.
 */
@Service()
export class UserService {
  private readonly api = inject(ApiClientService);

  /** Lista todos os usuários cadastrados. */
  list(): Observable<ManagedUser[]> {
    return this.api.get<ManagedUser[]>('/user');
  }

  /** Cria um novo usuário. */
  create(payload: CreateUserRequest): Observable<ManagedUser> {
    return this.api.post<ManagedUser>('/user', payload);
  }

  /** Atualiza parcialmente um usuário existente. */
  update(id: string, payload: UpdateUserRequest): Observable<ManagedUser> {
    return this.api.patch<ManagedUser>(`/user/${id}`, payload);
  }

  /** Remove permanentemente um usuário. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/user/${id}`);
  }

  /** Lista os pontos vinculados a um usuário. */
  listPoints(userId: string): Observable<Point[]> {
    return this.api.get<Point[]>(`/user/${userId}/points`);
  }

  /** Vincula pontos a um usuário (substitui a vinculação existente). */
  updatePoints(userId: string, pointIds: string[]): Observable<Point[]> {
    return this.api.patch<Point[]>(`/user/${userId}/points`, { pointIds });
  }

  /** Remove a vinculação de pontos de um usuário. */
  removePoints(userId: string): Observable<void> {
    return this.api.delete(`/user/${userId}/points`);
  }
}
