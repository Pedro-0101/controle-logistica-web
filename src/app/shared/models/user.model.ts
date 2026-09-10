/** Funções (papéis) disponíveis para um usuário do sistema. */
export type UserRole = 'user' | 'admin' | 'supervisor';

/** Usuário cadastrado no sistema, conforme retornado por `/user`. */
export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do POST /user. */
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

/** Corpo do PATCH /user/{id}. */
export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}
