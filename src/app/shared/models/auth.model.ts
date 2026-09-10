import type { CompanySummary } from './company.model';

/** Usuário autenticado, conforme retornado pela API. */
export interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
  companyId: string | null;
  company?: CompanySummary | null;
}

/** Credenciais de acesso (POST /auth/login). */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Resposta do POST /auth/login. */
export interface LoginResponse {
  access_token: string;
  user: User;
  company?: CompanySummary | null;
}

/** Resultado de autenticação normalizado para o front-end. */
export interface LoginResult {
  token: string;
  user: User;
}

/** Resposta do GET /auth/me. */
export interface MeResponse {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  company?: CompanySummary | null;
}
