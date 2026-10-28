import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { SystemStatsResponse } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/stats` da API principal — telemetria do serviço ANPR e
 * do registro automático de movimentações.
 */
@Service()
export class StatsService {
  private readonly api = inject(ApiClientService);

  /** Retorna as métricas consolidadas do sistema. */
  getStats(): Observable<SystemStatsResponse> {
    return this.api.get<SystemStatsResponse>('/stats');
  }
}
