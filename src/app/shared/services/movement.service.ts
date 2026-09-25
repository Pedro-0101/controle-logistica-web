import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  DiscardMovementsPayload,
  MovementDetail,
  MovementFilters,
  PaginatedMovements,
  PendingReviewMovement,
  RecalculateMovementPayload,
  UpdateMovementPayload,
} from '@/shared/models';
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

  /** Lista movimentos `pending_review` (placa do ANPR não reconhecida na base). */
  pendingReview(): Observable<PendingReviewMovement[]> {
    return this.api.get<PendingReviewMovement[]>('/movement/pending-review');
  }

  /**
   * Baixa a foto de evidência (JPEG) de um movimento como `Blob`.
   *
   * A rota exige o token JWT, então a imagem não pode ser usada direto em
   * `img[src]`; monte um `URL.createObjectURL(blob)` no componente.
   */
  evidence(id: string): Observable<Blob> {
    return this.api.getBlob(`/movement/${id}/evidence`);
  }

  /**
   * Reprocessa um movimento pendente com a placa corrigida ou o veículo
   * recém-cadastrado. Em caso de sucesso o movimento passa para `open`.
   */
  recalculate(id: string, payload: RecalculateMovementPayload): Observable<MovementDetail> {
    return this.api.post<MovementDetail>(`/movement/${id}/recalculate`, payload);
  }

  /**
   * Descarta movimentos pendentes marcados como leitura incorreta. Aceita um
   * ou vários ids (mesmo endpoint para descarte individual e em lote) e
   * retorna os movimentos atualizados com `status: discarded`.
   */
  discard(payload: DiscardMovementsPayload): Observable<MovementDetail[]> {
    return this.api.post<MovementDetail[]>('/movement/discard', payload);
  }

  /** Atualiza parcialmente os dados de um movimento existente. */
  update(id: string, payload: UpdateMovementPayload): Observable<MovementDetail> {
    return this.api.patch<MovementDetail>(`/movement/${id}`, payload);
  }
}
