import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AnprRecognition,
  ExternalInteractionFilters,
  ExternalInteractionUsage,
} from '@/shared/models';
import { toExternalInteractionHttpQuery } from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/anpr` da API, delegando o reconhecimento de placas.
 */
@Service()
export class AnprService {
  private readonly api = inject(ApiClientService);

  /**
   * Reconhece a placa de um frame codificado em base64 (sem o prefixo
   * `data:image/...;base64,`). Retorna a placa e, quando localizada, a caixa
   * delimitadora em pixels da imagem enviada.
   */
  recognizeImage(imagemBase64: string): Observable<AnprRecognition> {
    return this.api.post<AnprRecognition>('/anpr/reconhecer-imagem', { imagemBase64 });
  }

  /**
   * Uso consolidado das APIs externas em **todas as empresas**, com paginação,
   * totais do período e agregado por empresa. Restrito ao administrador global
   * (`companyId = null`); usuários vinculados a uma empresa recebem `403`.
   */
  externalUsage(filters?: ExternalInteractionFilters): Observable<ExternalInteractionUsage> {
    return this.api.get<ExternalInteractionUsage>('/anpr/external-interactions/usage', {
      params: toExternalInteractionHttpQuery(filters),
    });
  }
}
