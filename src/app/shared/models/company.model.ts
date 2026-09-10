/** Empresa, conforme retornado por `/company`. */
export interface Company {
  id: string;
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Dados do administrador criado junto da empresa (POST /company). */
export interface CompanyAdminRequest {
  name: string;
  email: string;
  password: string;
}

/** Corpo do POST /company. */
export interface CreateCompanyRequest {
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
  active?: boolean;
  admin: CompanyAdminRequest;
}

/** Corpo do PATCH /company/{id}. */
export interface UpdateCompanyRequest {
  name?: string;
  companyName?: string;
  cnpj?: string;
  stateRegistration?: string;
  address?: string;
  email?: string;
  active?: boolean;
}

/** Administrador criado junto da empresa, conforme resposta do POST /company. */
export interface CompanyAdminResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/** Resposta do POST /company. */
export interface CreateCompanyResponse {
  company: Company;
  admin: CompanyAdminResponse;
}

/** Resumo da empresa retornado no login e em `/auth/me`. */
export interface CompanySummary {
  id: string;
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
  active: boolean;
}
