import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  Camera,
  CreateCameraRequest,
  CurrentObservation,
  StreamUrls,
  UpdateCameraRequest,
} from '@/shared/models';
import { ApiClientService } from './api-client.service';

/**
 * Acesso ao recurso `/camera` da API, centralizando a gestão de câmeras IP.
 */
@Service()
export class CameraService {
  private readonly api = inject(ApiClientService);

  /** Lista as câmeras visíveis para o usuário autenticado. */
  list(): Observable<Camera[]> {
    return this.api.get<Camera[]>('/camera');
  }

  /** Obtém as URLs de streaming (HLS/WebRTC/RTSP) de uma câmera específica. */
  getStreamUrls(id: string): Observable<StreamUrls> {
    return this.api.get<StreamUrls>(`/camera/${id}/stream`);
  }

  /**
   * Consulta a leitura recente do monitoramento contínuo da câmera.
   * Use polling periódico: `status = "confirmed"` indica placa identificada.
   */
  currentObservation(id: string): Observable<CurrentObservation> {
    return this.api.get<CurrentObservation>(`/camera/${id}/current-observation`);
  }

  /** Cria uma nova câmera. */
  create(payload: CreateCameraRequest): Observable<Camera> {
    return this.api.post<Camera>('/camera', payload);
  }

  /** Atualiza parcialmente uma câmera existente. */
  update(id: string, payload: UpdateCameraRequest): Observable<Camera> {
    return this.api.patch<Camera>(`/camera/${id}`, payload);
  }

  /** Remove permanentemente uma câmera. */
  remove(id: string): Observable<void> {
    return this.api.delete(`/camera/${id}`);
  }
}
