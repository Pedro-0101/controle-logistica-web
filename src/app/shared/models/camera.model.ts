/** Tipo de autenticação da câmera. */
export type CameraAuthType = 'digest' | 'basic';

/** URLs de streaming via MediaMTX, conforme retornado por `/camera/{id}/stream`. */
export interface StreamUrls {
  hlsUrl: string;
  webrtcUrl: string;
  rtspUrl: string;
}

/**
 * Estado atual do monitoramento contínuo de uma câmera, conforme retornado por
 * `GET /camera/{id}/current-observation`.
 */
export type CameraObservationStatus = 'waiting' | 'candidate' | 'confirmed' | 'stale' | 'offline';

/** Leitura recente do ANPR para uma câmera monitorada. */
export interface CurrentObservation {
  cameraId: string;
  status: CameraObservationStatus;
  observationId: string | null;
  placa: string | null;
  confianca: number | null;
  capturedAt: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  consecutiveReads: number;
  /** Caixa delimitadora `[x1, y1, x2, y2]` da placa, em pixels da captura. */
  box: [number, number, number, number] | null;
}

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
  streamUrls?: StreamUrls;
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
