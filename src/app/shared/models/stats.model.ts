import type { HttpQuery } from './base.model';

/** Métricas do sistema expostas por `GET /stats` da API principal. */
export interface SystemStatsResponse {
  timestamp: string;
  scope: StatsScope;
  anpr: AnprSystemStats;
  registration: RegistrationStats;
}

/** Filtros aplicados e partes que permanecem globais na resposta de `/stats`. */
export interface StatsScope {
  companyId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  filtered: string[];
  global: string[];
}

/** Filtros aceitos por `GET /stats`. */
export interface StatsFilters {
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Converte filtros em HttpQuery (remove valores vazios). */
export function toStatsHttpQuery(filters?: StatsFilters): HttpQuery {
  if (!filters) return {};
  const query: HttpQuery = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}

/** Métricas do serviço ANPR (Python) e do monitoramento de observações. */
export interface AnprSystemStats {
  availability: AnprAvailability;
  performance: AnprPerformanceEnvelope;
  activeMonitors: number;
  monitorIds: string[];
  confirmedObservations: AnprConfirmedObservation[];
}

/** Disponibilidade das consultas ao serviço ANPR. */
export interface AnprAvailability {
  monitors: boolean;
  observations: boolean;
  checkedCameras: number | null;
  unavailableCameras: number | null;
}

/** Envelope das métricas de performance do serviço Python. */
export interface AnprPerformanceEnvelope {
  status: string;
  source: string;
  data: AnprPerformanceStats | null;
}

/** Snapshot de performance do serviço Python (`/stats` do anpr-service). */
export interface AnprPerformanceStats {
  version?: number;
  uptime_seconds?: number;
  window_capacity?: number;
  semantics?: Record<string, string>;
  counters?: Record<string, number>;
  queue?: Record<string, number>;
  durations?: Record<string, AnprDurationSummary>;
  cameras?: Record<string, AnprCameraStats>;
  count?: number;
  avg_ms?: number;
  min_ms?: number;
  max_ms?: number;
  p50_ms?: number;
  p95_ms?: number;
  window_count?: number;
}

/** Resumo de uma duração em milissegundos (janela móvel). */
export interface AnprDurationSummary {
  window_count: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
}

/** Métricas acumuladas de uma câmera específica. */
export interface AnprCameraStats {
  counters?: Record<string, number>;
  durations?: Record<string, AnprDurationSummary>;
}

/** Observação confirmada retornada pelo monitoramento ANPR. */
export interface AnprConfirmedObservation {
  cameraId: string;
  cameraName: string | null;
  companyId: string;
  plate: string | null;
  confidence: number | null;
  status: string;
  observationId: string;
  capturedAt: string | null;
  lastSeenAt: string | null;
}

/** Métricas do registro automático de movimentações no Nest. */
export interface RegistrationStats {
  source?: string;
  startedAt?: string;
  durationUnit?: string;
  sampleWindow?: string;
  countersScope?: string;
  registeredMeaning?: string;
  captureToRegistrationClock?: string;
  counts?: Record<string, number>;
  queue?: Record<string, number>;
  durations?: Record<string, RegistrationDurationSummary>;
}

/** Resumo de uma duração do registro automático. */
export interface RegistrationDurationSummary {
  count: number;
  avg: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
}
