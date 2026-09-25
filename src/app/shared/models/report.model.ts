import type { HttpQuery } from './base.model';

/** Veículo da frota própria presente nos relatórios de tempo. */
export interface ReportVehicleRef {
  id: string;
  plate: string;
  code: string;
  type: string;
}

/** Baseline histórico de uma rota (origem → destino). */
export interface ReportRouteBaseline {
  avgMinutes: number;
  p95Minutes: number;
  sampleCount: number;
}

/** Segmento de permanência (entrada → saída na mesma unidade). */
export interface ReportDwellSegment {
  kind: 'dwell';
  unitId: string;
  unitName: string | null;
  entryMovementId: string;
  entryPointId: string | null;
  entryPointName: string | null;
  entryAt: string;
  exitMovementId: string | null;
  exitPointId: string | null;
  exitPointName: string | null;
  exitAt: string | null;
  minutes: number | null;
  ongoing: boolean;
  inJourneyWindow: boolean;
  anomaly: 'missing_exit' | null;
}

/** Segmento de trânsito (saída de uma unidade → entrada na seguinte). */
export interface ReportTransitSegment {
  kind: 'transit';
  originUnitId: string;
  originUnitName: string | null;
  destinationUnitId: string | null;
  destinationUnitName: string | null;
  departedMovementId: string;
  departedAt: string;
  arrivedMovementId: string | null;
  arrivedAt: string | null;
  minutes: number | null;
  ongoing: boolean;
  inJourneyWindow: boolean;
  overnight: boolean;
  anomaly: 'missing_arrival' | null;
  baseline: ReportRouteBaseline | null;
  deviationPct: number | null;
}

export type ReportTimelineSegment = ReportDwellSegment | ReportTransitSegment;

/** Resumo de tempo de um veículo. */
export interface ReportVehicleTimeline {
  vehicle: ReportVehicleRef;
  segments: ReportTimelineSegment[];
  summary: {
    dwellCount: number;
    transitCount: number;
    totalDwellMinutes: number;
    totalTransitMinutes: number;
    currentState: 'at_unit' | 'in_transit' | 'unknown';
    currentUnitId: string | null;
    currentSince: string | null;
    currentMinutes: number | null;
  };
}

export interface VehicleTimelineResponse {
  range: ReportPeriod;
  vehicles: ReportVehicleTimeline[];
}

/** Veículo parado em uma unidade no momento do relatório. */
export interface FleetStatusUnit {
  unitId: string;
  unitName: string | null;
  vehicles: {
    vehicle: ReportVehicleRef;
    entryMovementId: string | null;
    since: string | null;
    dwellMinutes: number | null;
    inJourneyWindow: boolean;
  }[];
}

export interface FleetStatusResponse {
  generatedAt: string;
  atUnits: FleetStatusUnit[];
  inTransit: { vehicle: ReportVehicleRef; since: string | null; minutes: number | null }[];
  unknown: { vehicle: ReportVehicleRef }[];
}

export interface ReportDurationStats {
  visits: number;
  completed: number;
  avgMinutes: number;
  medianMinutes: number;
  p95Minutes: number;
  minMinutes: number;
  maxMinutes: number;
}

export interface DwellReportResponse {
  range: ReportPeriod;
  byVehicle: ({ vehicle: ReportVehicleRef } & ReportDurationStats)[];
  byUnit: ({ unitId: string; unitName: string | null } & ReportDurationStats)[];
}

export interface TransitReportResponse {
  range: ReportPeriod;
  routes: ({
    originUnitId: string;
    originUnitName: string | null;
    destinationUnitId: string | null;
    destinationUnitName: string | null;
  } & ReportDurationStats)[];
}

export interface UtilizationReportResponse {
  range: ReportPeriod;
  totals: { rangeMinutes: number; dwellMinutes: number; transitMinutes: number };
  byVehicle: {
    vehicle: ReportVehicleRef;
    rangeMinutes: number;
    dwellMinutes: number;
    transitMinutes: number;
    unaccountedMinutes: number;
    dwellPct: number;
    transitPct: number;
  }[];
}

export interface DwellException {
  vehicle: ReportVehicleRef | null;
  anomaly: 'open_too_long' | 'missing_exit';
  unitId: string;
  unitName: string | null;
  entryMovementId: string;
  entryAt: string;
  exitMovementId: string | null;
  minutes: number | null;
  ongoing: boolean;
}

export interface TransitException {
  vehicle: ReportVehicleRef | null;
  anomaly: 'missing_arrival' | 'above_p95' | 'overnight';
  originUnitId: string;
  originUnitName: string | null;
  destinationUnitId: string | null;
  destinationUnitName: string | null;
  departedMovementId: string;
  departedAt: string;
  minutes: number | null;
  baseline: ReportRouteBaseline | null;
  deviationPct: number | null;
  ongoing: boolean;
}

export interface ExceptionsResponse {
  range: ReportPeriod;
  summary: {
    openTooLong: number;
    missingExit: number;
    missingArrival: number;
    aboveBaseline: number;
    overnight: number;
  };
  openTooLong: DwellException[];
  missingExit: DwellException[];
  missingArrival: TransitException[];
  aboveBaseline: TransitException[];
  overnight: TransitException[];
}

export interface MovementBookRow {
  movementId: string;
  dateTime: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleCode: string;
  type: 'entry' | 'exit';
  unitId: string;
  unitName: string | null;
  pointId: string | null;
  pointName: string | null;
  driverName: string | null;
  purpose: string | null;
  status: string;
  kind: 'dwell' | 'transit' | null;
  minutes: number | null;
  ongoing: boolean;
  originUnitName: string | null;
  destinationUnitName: string | null;
  anomaly: string | null;
}

export interface MovementBookResponse {
  range: ReportPeriod;
  data: MovementBookRow[];
  summary: {
    movements: number;
    dwellMinutes: number;
    transitMinutes: number;
    anomalies: number;
  };
}

export interface ReportPeriod {
  dateFrom: string;
  dateTo: string;
}

/** Filtros aceitos pelos relatórios de tempo. */
export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  vehicleId?: string;
  adminUnityId?: string;
  pointId?: string;
}

/** Converte filtros em HttpQuery (remove valores vazios). */
export function toReportHttpQuery(filters?: ReportFilters): HttpQuery {
  if (!filters) return {};
  const query: HttpQuery = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}
