/** Modo de reconhecimento ANPR da empresa/ponto. */
export type AnprRecognitionMode = 'local' | 'verified' | 'external';

/** Momento em que a API externa de reconhecimento é acionada. */
export type AnprExternalTrigger = 'after_confirmation' | 'after_single_read';

/** Provider externo de reconhecimento de placas suportado. */
export type AnprExternalProvider = 'google_vision';

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
  anprRecognitionMode: AnprRecognitionMode;
  anprExternalProvider: AnprExternalProvider;
  anprExternalMinConfidence: number;
  anprExternalTimeoutMs: number;
  anprExternalFallbackToLocal: boolean;
  anprExternalTrigger: AnprExternalTrigger;
  anprTrustRegisteredVehicle: boolean;
  anprRegisterOnFirstRead: boolean;
  anprFirstReadMinConfidence: number;

  // Movimentação
  movementAutoCloseMinutes: number;
  requireDriverName: boolean;
  requirePurpose: boolean;

  // Jornada (relatórios de tempo)
  journeyWindowStart: string;
  journeyWindowEnd: string;
  journeyWindowDays: string;

  // Audit
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corpo do PATCH /company-config/:companyId (campos parciais). */
export type UpdateCompanyConfigRequest = Partial<
  Omit<
    CompanyConfig,
    'id' | 'companyId' | 'createdById' | 'updatedById' | 'createdAt' | 'updatedAt'
  >
>;
