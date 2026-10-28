import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { StatsFilters, SystemStatsResponse } from '@/shared/models';
import { toStatsHttpQuery } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/stats` da API principal — telemetria do serviço ANPR e
 * do registro automático de movimentações.
 */
@Service()
export class StatsService {
  private readonly api = inject(ApiClientService);

  /** Retorna as métricas consolidadas do sistema, opcionalmente filtradas. */
  getStats(filters?: StatsFilters): Observable<SystemStatsResponse> {
    return this.api.get<SystemStatsResponse>('/stats', {
      params: toStatsHttpQuery(filters),
    });
  }
}
