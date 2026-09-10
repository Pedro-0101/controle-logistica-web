/** Tipo do ponto de controle. */
export type PointType = 'entry' | 'exit' | 'both';

/** Ponto de controle, conforme retornado por `/point`. */
export interface Point {
  id: string;
  name: string;
  code: string;
  type: PointType;
  adminUnityId: string;
  companyId: string;
  active: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do POST /point. */
export interface CreatePointRequest {
  name: string;
  code: string;
  type?: PointType;
  adminUnityId: string;
  active?: boolean;
}

/** Corpo do PATCH /point/{id}. */
export interface UpdatePointRequest {
  name?: string;
  code?: string;
  type?: PointType;
  adminUnityId?: string;
  active?: boolean;
}
