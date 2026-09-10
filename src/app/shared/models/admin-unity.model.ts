/** Unidade administrativa, conforme retornado por `/admin-unity`. */
export interface AdminUnity {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string | null;
  email: string | null;
  companyId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do POST /admin-unity. */
export interface CreateAdminUnityRequest {
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  companyId: string;
  active?: boolean;
}

/** Corpo do PATCH /admin-unity/{id}. */
export interface UpdateAdminUnityRequest {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  companyId?: string;
  active?: boolean;
}
