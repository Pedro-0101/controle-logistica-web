/** Tipo do ponto de controle. */
export type PointType = 'entry' | 'exit' | 'both';

/** Configuração ANPR de um ponto. */
export interface PointAnprConfig {
  /** Habilitar registro automático de movimentação por ANPR. `null` = herda da empresa. */
  anprAutoRegister: boolean | null;
  /** Salvar foto quando placa não reconhecida. `null` = herda da empresa. */
  anprSaveUnrecognizedPhotos: boolean | null;
  /** Intervalo mínimo em segundos entre registros automáticos do mesmo veículo. `null` = herda da empresa. */
  anprAutoRegisterCooldownSeconds: number | null;
  /** Confiança mínima (0–1) para aceitar leitura ANPR. `null` = herda da empresa. */
  anprConfidenceThreshold: number | null;
  /** Timeout em segundos para confirmar leitura de placa. `null` = herda da empresa. */
  anprMatchTimeoutSeconds: number | null;
  /** Número de leituras consecutivas para confirmar placa. `null` = herda da empresa. */
  anprConfirmationReads: number | null;
  /** Tempo em segundos para considerar observação expirada. `null` = herda da empresa. */
  anprStaleAfterSeconds: number | null;
}

/** Ponto de controle, conforme retornado por `/point`. */
export interface Point extends PointAnprConfig {
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
export interface CreatePointRequest extends Partial<PointAnprConfig> {
  name: string;
  code: string;
  type?: PointType;
  adminUnityId: string;
  active?: boolean;
}

/** Corpo do PATCH /point/{id}. */
export interface UpdatePointRequest extends Partial<PointAnprConfig> {
  name?: string;
  code?: string;
  type?: PointType;
  adminUnityId?: string;
  active?: boolean;
}
