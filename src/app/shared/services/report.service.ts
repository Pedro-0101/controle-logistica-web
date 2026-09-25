import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  DwellReportResponse,
  ExceptionsResponse,
  FleetStatusResponse,
  MovementBookResponse,
  ReportFilters,
  TransitReportResponse,
  UtilizationReportResponse,
  VehicleTimelineResponse,
} from '@/shared/models';
import { toReportHttpQuery } from '@/shared/models';
import { toHttpParams } from '@/shared/utils/http-params';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/reports` da API — relatórios gerenciais de tempo
 * (permanência e trânsito) da frota própria.
 */
@Service()
export class ReportService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  /** Linha do tempo de permanência/trânsito por veículo. */
  vehicleTimeline(filters?: ReportFilters): Observable<VehicleTimelineResponse> {
    return this.api.get<VehicleTimelineResponse>('/reports/vehicle-timeline', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Posição atual da frota (dentro de unidade ou em trânsito). */
  fleetStatus(): Observable<FleetStatusResponse> {
    return this.api.get<FleetStatusResponse>('/reports/fleet-status');
  }

  /** Permanência agregada por veículo e unidade. */
  dwell(filters?: ReportFilters): Observable<DwellReportResponse> {
    return this.api.get<DwellReportResponse>('/reports/dwell', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Trânsito agregado por rota (origem → destino). */
  transit(filters?: ReportFilters): Observable<TransitReportResponse> {
    return this.api.get<TransitReportResponse>('/reports/transit', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Utilização da frota (permanência/trânsito/sem registro). */
  utilization(filters?: ReportFilters): Observable<UtilizationReportResponse> {
    return this.api.get<UtilizationReportResponse>('/reports/utilization', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Exceções de tempo (sem saída, sem chegada, acima do p95, pernoite). */
  exceptions(filters?: ReportFilters): Observable<ExceptionsResponse> {
    return this.api.get<ExceptionsResponse>('/reports/exceptions', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Livro de movimentação com os tempos calculados. */
  movementBook(filters?: ReportFilters): Observable<MovementBookResponse> {
    return this.api.get<MovementBookResponse>('/reports/movement-book', {
      params: toReportHttpQuery(filters),
    });
  }

  /** Exporta o livro de movimentação em CSV. */
  downloadMovementBookCsv(filters?: ReportFilters): Observable<string> {
    return this.http.get(`${environment.apiUrl}/reports/movement-book`, {
      params: toHttpParams({ ...filters, format: 'csv' }),
      responseType: 'text',
    });
  }
}
