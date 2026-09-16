/** Configuração da empresa, conforme retornado por `/company-config/:companyId`. */
export interface CompanyConfig {
  id: string;
  companyId: string;

  // Geral
  timezone: string;
  language: string;

  // Câmera defaults
  cameraDefaultProtocol: 'http' | 'https';
  cameraDefaultPort: number;
  cameraDefaultAuthType: 'digest' | 'basic';
  cameraSnapshotIntervalMs: number;

  // ANPR
  anprConfidenceThreshold: number;
  anprMatchTimeoutSeconds: number;
  anprConfirmationReads: number;
  anprStaleAfterSeconds: number;
  anprAutoRegister: boolean;
  anprSaveUnrecognizedPhotos: boolean;
  anprAutoRegisterCooldownSeconds: number;

  // ANPR — modo de reconhecimento / API externa
  anprRecognitionMode: 'local' | 'verified' | 'external';
  anprExternalProvider: 'google_vision';
  anprExternalMinConfidence: number;
  anprExternalTimeoutMs: number;
  anprExternalFallbackToLocal: boolean;

  // Movimentação
  movementAutoCloseMinutes: number;
  requireDriverName: boolean;
  requirePurpose: boolean;

  // Audit
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do PATCH /company-config/:companyId (campos parciais). */
export type UpdateCompanyConfigRequest = Partial<
  Omit<CompanyConfig, 'id' | 'companyId' | 'createdById' | 'updatedById' | 'createdAt' | 'updatedAt'>
>;
