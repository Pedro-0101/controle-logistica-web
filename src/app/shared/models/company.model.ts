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
