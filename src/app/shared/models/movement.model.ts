import type { HttpQuery } from './base.model';

export type MovementType = 'entry' | 'exit';

export type MovementStatus = 'open' | 'closed' | 'pending_review' | 'discarded';

/** Resumo do ponto retornado na listagem. */
export interface PointSummary {
  id: string;
  name: string;
  code: string;
  type: 'entry' | 'exit' | 'both';
}

/** Resumo do veículo retornado na listagem. */
export interface VehicleSummary {
  id: string;
  plate: string;
  code: string;
  type: 'own' | 'thirdParty' | 'visitor';
  active: boolean;
}

/** Resumo da câmera retornado na listagem. */
export interface CameraSummary {
  id: string;
  name: string;
  ip: string;
}

/** Item de movimento conforme retornado por `GET /movement` (listagem paginada). */
export interface MovementListItem {
  id: string;
  type: MovementType;
  dateTime: string;
  status: MovementStatus;
  purpose: string | null;
  driverName: string | null;
  notes: string | null;
  recognizedPlate: string | null;
  autoRegistered: boolean;
  recalculatedAt: string | null;
  observationId: string | null;
  companyId: string;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  point: PointSummary | null;
  vehicle: VehicleSummary | null;
  camera: CameraSummary | null;
}

/** Metadados de paginação. */
export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Resposta paginada de movimentações. */
export interface PaginatedMovements {
  data: MovementListItem[];
  meta: PaginatedMeta;
}

/**
 * Movimento pendente de revisão, conforme retornado por
 * `GET /movement/pending-review` (placa lida pelo ANPR não encontrada na base).
 */
export interface PendingReviewMovement {
  id: string;
  observationId: string | null;
  pointId: string | null;
  vehicleId: string | null;
  recognizedPlate: string | null;
  type: MovementType;
  dateTime: string;
  status: 'pending_review';
  companyId: string;
  autoRegistered: boolean;
  photoPath: string | null;
  createdAt: string;
}

/**
 * Movimento no formato plano (sem resumos de ponto/veículo/câmera), retornado
 * por `GET /movement/{id}`, `PATCH /movement/{id}` e `POST /movement/{id}/recalculate`.
 */
export interface MovementDetail {
  id: string;
  pointId: string | null;
  vehicleId: string | null;
  type: MovementType;
  dateTime: string;
  status: MovementStatus;
  companyId: string;
  recognizedPlate: string | null;
  autoRegistered: boolean;
  recalculatedAt: string | null;
  purpose: string | null;
  driverName: string | null;
  notes: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  observationId: string | null;
}

/** Status aceito por `PATCH /movement/{id}` (não permite `pending_review`). */
export type MovementEditableStatus = 'open' | 'closed';

/** Corpo do `POST /movement/{id}/recalculate` — informar `plate` ou `vehicleId`. */
export interface RecalculateMovementPayload {
  plate?: string;
  vehicleId?: string;
}

/**
 * Corpo do `POST /movement/discard` — lista de movimentos `pending_review`
 * descartados como leitura incorreta. Entre 1 e 500 ids.
 */
export interface DiscardMovementsPayload {
  ids: string[];
}

/** Corpo do `PATCH /movement/{id}` — todos os campos são opcionais. */
export interface UpdateMovementPayload {
  pointId?: string;
  vehicleId?: string;
  type?: MovementType;
  dateTime?: string;
  status?: MovementEditableStatus;
  purpose?: string;
  driverName?: string;
  notes?: string;
}

/** Filtros para listagem de movimentações. */
export interface MovementFilters {
  page?: number;
  limit?: number;
  type?: MovementType;
  status?: MovementStatus;
  plate?: string;
  driverName?: string;
  purpose?: string;
  autoRegistered?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  orderBy?: 'dateTime' | 'createdAt' | 'status' | 'type';
  order?: 'ASC' | 'DESC';
}

/** Converte filtros em HttpQuery (remove valores vazios). */
export function toMovementHttpQuery(filters?: MovementFilters): HttpQuery {
  if (!filters) return {};
  const query: HttpQuery = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}
