import type { HttpQuery } from './base.model';

export type MovementType = 'entry' | 'exit';

export type MovementStatus = 'open' | 'closed' | 'pending_review';

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
