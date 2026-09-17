import type {
  AnprExternalProvider,
  AnprExternalTrigger,
  AnprRecognitionMode,
} from './company-config.model';

/** Tipo do ponto de controle. */
export type PointType = 'entry' | 'exit' | 'both';

/** Configuração ANPR de um ponto. */
export interface PointAnprConfig {
  /** Herda configurações ANPR da empresa. Se `true`, ignora os campos ANPR individuais. */
  inheritCompanyConfig: boolean;
  /** Habilitar registro automático de movimentação por ANPR (usado quando inheritCompanyConfig = false). */
  anprAutoRegister: boolean | null;
  /** Salvar foto quando placa não reconhecida (usado quando inheritCompanyConfig = false). */
  anprSaveUnrecognizedPhotos: boolean | null;
  /** Intervalo mínimo em segundos entre registros automáticos do mesmo veículo. */
  anprAutoRegisterCooldownSeconds: number | null;
  /** Confiança mínima (0–1) para aceitar leitura ANPR. */
  anprConfidenceThreshold: number | null;
  /** Timeout em segundos para confirmar leitura de placa. */
  anprMatchTimeoutSeconds: number | null;
  /** Número de leituras consecutivas para confirmar placa. */
  anprConfirmationReads: number | null;
  /** Tempo em segundos para considerar observação expirada. */
  anprStaleAfterSeconds: number | null;
  /** Modo de reconhecimento: `local`, `verified` ou `external` (usado quando inheritCompanyConfig = false). */
  anprRecognitionMode: AnprRecognitionMode | null;
  /** Provider externo de reconhecimento de placas (usado quando inheritCompanyConfig = false). */
  anprExternalProvider: AnprExternalProvider | null;
  /** Confiança mínima (0–1) para aceitar a placa da API externa (usado quando inheritCompanyConfig = false). */
  anprExternalMinConfidence: number | null;
  /** Timeout em milissegundos da chamada à API externa (usado quando inheritCompanyConfig = false). */
  anprExternalTimeoutMs: number | null;
  /** Usar leitura local quando a API externa não retornar placa válida (usado quando inheritCompanyConfig = false). */
  anprExternalFallbackToLocal: boolean | null;
  /** Momento de acionamento da API externa (usado quando inheritCompanyConfig = false). */
  anprExternalTrigger: AnprExternalTrigger | null;
  /** Confirmar placa de veículo cadastrado sem consultar a API externa (usado quando inheritCompanyConfig = false). */
  anprTrustRegisteredVehicle: boolean | null;
  /** Registrar movimento na primeira leitura quando a placa tiver veículo cadastrado (usado quando inheritCompanyConfig = false). */
  anprRegisterOnFirstRead: boolean | null;
  /** Confiança mínima (0–1) da leitura local para o atalho de placa cadastrada na primeira leitura. */
  anprFirstReadMinConfidence: number | null;
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
