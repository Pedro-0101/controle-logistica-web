import type { HttpQuery } from './base.model';
import type { PaginatedMeta } from './movement.model';

/** Modo de reconhecimento vigente na chamada externa. */
export type ExternalRecognitionMode = 'local' | 'verified' | 'external';

/** Resultado da chamada à API externa de reconhecimento. */
export type ExternalInteractionOutcome =
  'success' | 'no_plate' | 'low_confidence' | 'timeout' | 'error' | 'rate_limited';

/** Origem da placa final usada no movimento. */
export type ExternalFinalSource = 'external' | 'local' | 'local_fallback' | 'none';

/**
 * Chamada feita a uma API externa de reconhecimento (ex.: Google Vision),
 * conforme retornado por `GET /anpr/external-interactions`.
 */
export interface ExternalInteraction {
  id: string;
  companyId: string;
  cameraId: string | null;
  pointId: string | null;
  observationId: string | null;
  movementId: string | null;
  provider: string;
  mode: ExternalRecognitionMode;
  localPlate: string | null;
  externalPlate: string | null;
  finalPlate: string | null;
  finalSource: ExternalFinalSource | null;
  outcome: ExternalInteractionOutcome;
  httpStatus: number | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  latencyMs: number | null;
  billableUnits: number;
  unitCost: number | null;
  costAmount: number | null;
  costCurrency: string;
  requestBytes: number | null;
  responseBytes: number | null;
  createdAt: string;
}

/** Totais agregados do período filtrado. */
export interface ExternalInteractionSummary {
  calls: number;
  success: number;
  noPlate: number;
  failures: number;
  externalUsed: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  totalCost: number | null;
  costCurrency: string;
}

/** Agregado de uso por empresa. */
export interface CompanyUsage {
  companyId: string;
  companyName: string | null;
  calls: number;
  success: number;
  noPlate: number;
  failures: number;
  avgLatencyMs: number | null;
  totalCost: number | null;
}

/** Resposta de `GET /anpr/external-interactions/usage` (somente admin raiz). */
export interface ExternalInteractionUsage {
  data: ExternalInteraction[];
  meta: PaginatedMeta;
  summary: ExternalInteractionSummary;
  byCompany: CompanyUsage[];
}

/** Filtros aceitos pelas rotas de interações externas. */
export interface ExternalInteractionFilters {
  page?: number;
  limit?: number;
  provider?: string;
  companyId?: string;
  mode?: ExternalRecognitionMode;
  outcome?: ExternalInteractionOutcome;
  finalSource?: ExternalFinalSource;
  cameraId?: string;
  observationId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Converte filtros em HttpQuery (remove valores vazios). */
export function toExternalInteractionHttpQuery(filters?: ExternalInteractionFilters): HttpQuery {
  if (!filters) return {};
  const query: HttpQuery = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}
