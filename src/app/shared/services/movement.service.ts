import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { MovementFilters, PaginatedMovements } from '@/shared/models';
import { toMovementHttpQuery } from '@/shared/models';
import { ApiClientService } from './api-client.service';

@Service()
export class MovementService {
  private readonly api = inject(ApiClientService);

  list(filters?: MovementFilters): Observable<PaginatedMovements> {
    return this.api.get<PaginatedMovements>('/movement', {
      params: toMovementHttpQuery(filters),
    });
  }
}
