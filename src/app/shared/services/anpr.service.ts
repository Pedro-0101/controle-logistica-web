import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AnprRecognition } from '@/shared/models';
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
}
