/** Tipo de autenticação da câmera. */
export type CameraAuthType = 'digest' | 'basic';

/** Câmera IP, conforme retornado por `/camera`. */
export interface Camera {
  id: string;
  adminUnityId: string;
  pointId: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  authType: CameraAuthType;
  snapshotUrl: string | null;
  description: string | null;
  companyId: string;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do POST /camera. */
export interface CreateCameraRequest {
  adminUnityId: string;
  pointId: string;
  name: string;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  authType?: CameraAuthType;
  snapshotUrl?: string;
  description?: string;
}

/** Corpo do PATCH /camera/{id}. */
export interface UpdateCameraRequest {
  adminUnityId?: string;
  pointId?: string;
  name?: string;
  ip?: string;
  port?: number;
  username?: string;
  password?: string;
  authType?: CameraAuthType;
  snapshotUrl?: string;
  description?: string;
}
