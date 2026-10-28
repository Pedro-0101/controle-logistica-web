import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardTableImports } from '@/shared/components/table';
import { LoggerService } from '@/shared/services/logger.service';
import { StatsService } from '@/shared/services/stats.service';
import type { SystemStatsResponse } from '@/shared/models';

type BadgeType = 'default' | 'secondary' | 'destructive' | 'outline';

const ANPR_DURATION_LABELS: Record<string, string> = {
  capture: 'Captura',
  capture_failure: 'Falha de captura',
  queue_wait: 'Espera na fila',
  frame_age: 'Idade do frame',
  inference: 'Inferência',
  capture_to_result: 'Captura → resultado',
};

const ANPR_COUNTER_LABELS: Record<string, string> = {
  snapshots: 'Snapshots',
  snapshot_bytes: 'Bytes capturados',
  scene_inference_skipped: 'Inferências ignoradas (cena estática)',
  capture_error: 'Erros de captura',
  admission_skipped: 'Admissões ignoradas',
  replaced: 'Substituídas',
  submitted: 'Enviadas',
  manual_submitted: 'Manuais enviadas',
  manual_timeout: 'Timeouts manuais',
  expired_before_inference: 'Expiradas antes da inferência',
  inference_error: 'Erros de inferência',
  recognized: 'Reconhecidas',
  no_plate: 'Sem placa',
  expired_after_inference: 'Expiradas após inferência',
  callback_error: 'Erros de callback',
};

const ANPR_QUEUE_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  active: 'Em execução',
  workers: 'Workers',
  capacity: 'Capacidade',
};

const REGISTRATION_COUNT_LABELS: Record<string, string> = {
  events: 'Eventos recebidos',
  reconnects: 'Reconexões',
  resets: 'Resets',
  overflow: 'Overflow',
  processed: 'Processados',
  waitingConfirmation: 'Aguardando confirmação',
  ignored: 'Ignorados',
  errors: 'Erros',
  registered: 'Registrados',
};

const REGISTRATION_QUEUE_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  active: 'Em execução',
  concurrency: 'Concorrência',
  maxPending: 'Limite pendente',
};

const REGISTRATION_DURATION_LABELS: Record<string, string> = {
  queueWait: 'Espera na fila',
  processing: 'Processamento',
  captureToRegistration: 'Captura → registro',
};

/**
 * Métricas do sistema (`GET /stats`): disponibilidade e performance do serviço
 * ANPR, observações confirmadas e telemetria do registro automático.
 * Tela restrita a usuários com a função `admin`.
 */
@Component({
  selector: 'app-system-stats',
  imports: [
    SiteHeader,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardTableImports,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Métricas do sistema</h1>
          <p class="text-sm text-muted-foreground">
            Telemetria do serviço ANPR e do registro automático de movimentações.
          </p>
          @if (stats(); as s) {
            <p class="text-xs text-muted-foreground">
              Atualizado em {{ formatDateTime(s.timestamp) }}
            </p>
          }
        </div>

        <button
          z-button
          zType="outline"
          zSize="sm"
          type="button"
          [zLoading]="loading()"
          (click)="carregar()"
        >
          <ng-icon name="lucideRefreshCw" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      @if (error(); as message) {
        <div
          class="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <ng-icon name="lucideCircleAlert" aria-hidden="true" class="size-4 shrink-0" />
          <span>{{ message }}</span>
        </div>
      }

      @if (!stats() && loading()) {
        <z-card>
          <div class="p-10 text-center text-sm text-muted-foreground">Carregando métricas...</div>
        </z-card>
      }

      @if (stats(); as s) {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon
                name="lucideMonitorPlay"
                aria-hidden="true"
                class="size-5 text-muted-foreground"
              />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Monitores ativos</span>
                <span class="text-xl font-semibold">{{ formatNumber(s.anpr.activeMonitors) }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideCheckCircle" aria-hidden="true" class="size-5 text-success" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Observações confirmadas</span>
                <span class="text-xl font-semibold">{{
                  formatNumber(s.anpr.confirmedObservations.length)
                }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideInbox" aria-hidden="true" class="size-5 text-muted-foreground" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Fila ANPR</span>
                <span class="text-xl font-semibold">{{
                  formatNumber(anprQueueValue('pending'))
                }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ formatNumber(anprQueueValue('active')) }} em execução
                </span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideClock" aria-hidden="true" class="size-5 text-muted-foreground" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Uptime ANPR</span>
                <span class="text-xl font-semibold">{{
                  formatUptime(s.anpr.performance.data?.uptime_seconds)
                }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon
                name="lucideServer"
                aria-hidden="true"
                class="size-5 text-muted-foreground"
              />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Registros automáticos</span>
                <span class="text-xl font-semibold">{{
                  formatNumber(registrationCount('registered'))
                }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon
                name="lucideTriangleAlert"
                aria-hidden="true"
                class="size-5 text-destructive"
              />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Erros de registro</span>
                <span class="text-xl font-semibold">{{
                  formatNumber(registrationCount('errors'))
                }}</span>
              </div>
            </div>
          </z-card>
        </div>

        <z-card>
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
          >
            <h2 class="text-sm font-medium">Serviço ANPR</h2>

            <div class="flex flex-wrap items-center gap-2">
              <z-badge
                [zType]="s.anpr.availability.monitors ? 'default' : 'destructive'"
                zShape="pill"
              >
                Monitores {{ s.anpr.availability.monitors ? 'disponíveis' : 'indisponíveis' }}
              </z-badge>
              <z-badge
                [zType]="s.anpr.availability.observations ? 'default' : 'destructive'"
                zShape="pill"
              >
                Observações
                {{ s.anpr.availability.observations ? 'disponíveis' : 'indisponíveis' }}
              </z-badge>
              @if (s.anpr.availability.checkedCameras !== null) {
                <z-badge zType="outline" zShape="pill">
                  {{ formatNumber(s.anpr.availability.checkedCameras) }} câmeras verificadas
                </z-badge>
              }
              @if (s.anpr.availability.unavailableCameras) {
                <z-badge zType="outline" zShape="pill">
                  {{ formatNumber(s.anpr.availability.unavailableCameras) }} indisponíveis
                </z-badge>
              }
            </div>
          </div>

          <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (entry of anprQueueEntries(); track entry.key) {
              <div class="rounded-md border border-border p-3">
                <div class="text-xs text-muted-foreground">
                  {{ anprQueueLabel(entry.key) }}
                </div>
                <div class="text-lg font-semibold">{{ formatNumber(entry.value) }}</div>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Fila do serviço ANPR indisponível.</p>
            }
          </div>

          @if (s.anpr.performance.status !== 'available' || !s.anpr.performance.data) {
            <div class="border-t border-border px-4 py-4 text-sm text-muted-foreground">
              Métricas de performance do serviço ANPR indisponíveis no momento.
            </div>
          }
        </z-card>

        @if (s.anpr.performance.data; as p) {
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">Inferências (total)</span>
                <span class="text-xl font-semibold">{{ formatNumber(p.count) }}</span>
              </div>
            </z-card>
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">Média</span>
                <span class="text-xl font-semibold">{{ formatMs(p.avg_ms) }}</span>
              </div>
            </z-card>
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">p50</span>
                <span class="text-xl font-semibold">{{ formatMs(p.p50_ms) }}</span>
              </div>
            </z-card>
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">p95</span>
                <span class="text-xl font-semibold">{{ formatMs(p.p95_ms) }}</span>
              </div>
            </z-card>
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">Mínimo</span>
                <span class="text-xl font-semibold">{{ formatMs(p.min_ms) }}</span>
              </div>
            </z-card>
            <z-card>
              <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-muted-foreground">Máximo</span>
                <span class="text-xl font-semibold">{{ formatMs(p.max_ms) }}</span>
              </div>
            </z-card>
          </div>

          <div class="grid gap-6 xl:grid-cols-2">
            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Contadores ANPR</h2>
                <p class="text-xs text-muted-foreground">
                  Acumulados desde o início do processo. Bytes e skips por cena estática inclusos.
                </p>
              </div>

              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Métrica</th>
                      <th z-table-head class="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (entry of anprCounterEntries(); track entry.key) {
                      <tr z-table-row>
                        <td z-table-cell>{{ anprCounterLabel(entry.key) }}</td>
                        <td z-table-cell class="text-right font-medium">
                          {{ formatCounter(entry.key, entry.value) }}
                        </td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td z-table-cell colspan="2" class="py-6 text-center text-muted-foreground">
                          Nenhum contador disponível.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </z-card>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Durações ANPR</h2>
                <p class="text-xs text-muted-foreground">
                  Milissegundos, janela móvel de {{ formatNumber(p.window_capacity) }} amostras por
                  métrica.
                </p>
              </div>

              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Métrica</th>
                      <th z-table-head class="text-right">Amostras</th>
                      <th z-table-head class="text-right">Média</th>
                      <th z-table-head class="text-right">p50</th>
                      <th z-table-head class="text-right">p95</th>
                      <th z-table-head class="text-right">Mín.</th>
                      <th z-table-head class="text-right">Máx.</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (entry of anprDurationEntries(); track entry.key) {
                      <tr z-table-row>
                        <td z-table-cell>{{ anprDurationLabel(entry.key) }}</td>
                        <td z-table-cell class="text-right">
                          {{ formatNumber(entry.value.window_count) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatMs(entry.value.avg_ms) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatMs(entry.value.p50_ms) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatMs(entry.value.p95_ms) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatMs(entry.value.min_ms) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatMs(entry.value.max_ms) }}
                        </td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td z-table-cell colspan="7" class="py-6 text-center text-muted-foreground">
                          Nenhuma duração amostrada.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </z-card>
          </div>

          <z-card>
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Métricas por câmera</h2>
              <p class="text-xs text-muted-foreground">
                Contadores e durações das câmeras ativas recentemente no serviço ANPR.
              </p>
            </div>

            <div class="flex flex-col divide-y divide-border">
              @for (camera of cameraEntries(); track camera.id) {
                <details class="group">
                  <summary
                    class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium hover:bg-accent/50"
                  >
                    <span class="font-mono">{{ camera.id }}</span>
                    <span class="text-xs text-muted-foreground">
                      {{ formatNumber(camera.counters.length) }} contadores ·
                      {{ formatNumber(camera.durations.length) }} durações
                    </span>
                  </summary>

                  <div class="grid gap-4 px-4 pb-4 xl:grid-cols-2">
                    <div class="overflow-x-auto">
                      <table z-table>
                        <thead z-table-header>
                          <tr z-table-row>
                            <th z-table-head>Contador</th>
                            <th z-table-head class="text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody z-table-body>
                          @for (entry of camera.counters; track entry.key) {
                            <tr z-table-row>
                              <td z-table-cell>{{ anprCounterLabel(entry.key) }}</td>
                              <td z-table-cell class="text-right font-medium">
                                {{ formatCounter(entry.key, entry.value) }}
                              </td>
                            </tr>
                          } @empty {
                            <tr z-table-row>
                              <td
                                z-table-cell
                                colspan="2"
                                class="py-4 text-center text-muted-foreground"
                              >
                                Sem contadores.
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>

                    <div class="overflow-x-auto">
                      <table z-table>
                        <thead z-table-header>
                          <tr z-table-row>
                            <th z-table-head>Duração</th>
                            <th z-table-head class="text-right">Amostras</th>
                            <th z-table-head class="text-right">Média</th>
                            <th z-table-head class="text-right">p95</th>
                            <th z-table-head class="text-right">Máx.</th>
                          </tr>
                        </thead>
                        <tbody z-table-body>
                          @for (entry of camera.durations; track entry.key) {
                            <tr z-table-row>
                              <td z-table-cell>{{ anprDurationLabel(entry.key) }}</td>
                              <td z-table-cell class="text-right">
                                {{ formatNumber(entry.value.window_count) }}
                              </td>
                              <td z-table-cell class="text-right">
                                {{ formatMs(entry.value.avg_ms) }}
                              </td>
                              <td z-table-cell class="text-right">
                                {{ formatMs(entry.value.p95_ms) }}
                              </td>
                              <td z-table-cell class="text-right">
                                {{ formatMs(entry.value.max_ms) }}
                              </td>
                            </tr>
                          } @empty {
                            <tr z-table-row>
                              <td
                                z-table-cell
                                colspan="5"
                                class="py-4 text-center text-muted-foreground"
                              >
                                Sem durações.
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              } @empty {
                <p class="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma câmera com métricas registradas.
                </p>
              }
            </div>
          </z-card>
        }

        <z-card>
          <div class="border-b border-border px-4 py-3">
            <h2 class="text-sm font-medium">Observações confirmadas</h2>
            <p class="text-xs text-muted-foreground">
              Últimas leituras confirmadas pelo serviço ANPR nas câmeras monitoradas.
            </p>
          </div>

          <div class="overflow-x-auto">
            <table z-table>
              <thead z-table-header>
                <tr z-table-row>
                  <th z-table-head>Câmera</th>
                  <th z-table-head>Placa</th>
                  <th z-table-head class="text-right">Confiança</th>
                  <th z-table-head>Status</th>
                  <th z-table-head>Capturada em</th>
                  <th z-table-head>Vista por último</th>
                </tr>
              </thead>
              <tbody z-table-body>
                @for (
                  observation of s.anpr.confirmedObservations;
                  track observation.observationId
                ) {
                  <tr z-table-row>
                    <td z-table-cell class="whitespace-nowrap">
                      {{ observation.cameraName ?? observation.cameraId }}
                    </td>
                    <td z-table-cell class="font-mono font-medium">
                      {{ observation.plate ?? '—' }}
                    </td>
                    <td z-table-cell class="text-right">
                      {{ formatConfidence(observation.confidence) }}
                    </td>
                    <td z-table-cell>
                      <z-badge [zType]="observationBadgeType(observation.status)" zShape="pill">
                        {{ observationStatusLabel(observation.status) }}
                      </z-badge>
                    </td>
                    <td z-table-cell class="whitespace-nowrap">
                      {{ formatDateTime(observation.capturedAt) }}
                    </td>
                    <td z-table-cell class="whitespace-nowrap">
                      {{ formatDateTime(observation.lastSeenAt) }}
                    </td>
                  </tr>
                } @empty {
                  <tr z-table-row>
                    <td z-table-cell colspan="6" class="py-10 text-center text-muted-foreground">
                      Nenhuma observação confirmada no momento.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </z-card>

        <z-card>
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"
          >
            <div>
              <h2 class="text-sm font-medium">Registro automático</h2>
              <p class="text-xs text-muted-foreground">
                Iniciado em {{ formatDateTime(s.registration.startedAt) }} · janela
                {{ s.registration.sampleWindow ?? '—' }} · contadores
                {{ s.registration.countersScope ?? '—' }}.
              </p>
            </div>
            <z-badge zType="outline" zShape="pill">
              Unidade: {{ s.registration.durationUnit ?? 'ms' }}
            </z-badge>
          </div>

          <div class="grid gap-6 p-4 xl:grid-cols-2">
            <div class="overflow-x-auto">
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Contador</th>
                    <th z-table-head class="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (entry of registrationCountEntries(); track entry.key) {
                    <tr z-table-row>
                      <td z-table-cell>{{ registrationCountLabel(entry.key) }}</td>
                      <td z-table-cell class="text-right font-medium">
                        {{ formatNumber(entry.value) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="2" class="py-6 text-center text-muted-foreground">
                        Nenhum contador disponível.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex flex-col gap-4">
              <div class="grid gap-3 sm:grid-cols-2">
                @for (entry of registrationQueueEntries(); track entry.key) {
                  <div class="rounded-md border border-border p-3">
                    <div class="text-xs text-muted-foreground">
                      {{ registrationQueueLabel(entry.key) }}
                    </div>
                    <div class="text-lg font-semibold">{{ formatNumber(entry.value) }}</div>
                  </div>
                } @empty {
                  <p class="text-sm text-muted-foreground">Fila de registro indisponível.</p>
                }
              </div>

              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Duração</th>
                      <th z-table-head class="text-right">Amostras</th>
                      <th z-table-head class="text-right">Média</th>
                      <th z-table-head class="text-right">p50</th>
                      <th z-table-head class="text-right">p95</th>
                      <th z-table-head class="text-right">Máx.</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (entry of registrationDurationEntries(); track entry.key) {
                      <tr z-table-row>
                        <td z-table-cell>{{ registrationDurationLabel(entry.key) }}</td>
                        <td z-table-cell class="text-right">
                          {{ formatNumber(entry.value.count) }}
                        </td>
                        <td z-table-cell class="text-right">{{ formatMs(entry.value.avg) }}</td>
                        <td z-table-cell class="text-right">{{ formatMs(entry.value.p50) }}</td>
                        <td z-table-cell class="text-right">{{ formatMs(entry.value.p95) }}</td>
                        <td z-table-cell class="text-right">{{ formatMs(entry.value.max) }}</td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td z-table-cell colspan="6" class="py-6 text-center text-muted-foreground">
                          Nenhuma duração amostrada.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </z-card>
      }
    </main>
  `,
})
export class SystemStats implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly logger = inject(LoggerService).create('SystemStats');

  protected readonly stats = signal<SystemStatsResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly anprQueueEntries = computed(() =>
    this.entries(this.stats()?.anpr.performance.data?.queue),
  );
  protected readonly anprCounterEntries = computed(() =>
    this.entries(this.stats()?.anpr.performance.data?.counters),
  );
  protected readonly anprDurationEntries = computed(() =>
    this.entries(this.stats()?.anpr.performance.data?.durations),
  );
  protected readonly cameraEntries = computed(() => {
    const cameras = this.stats()?.anpr.performance.data?.cameras;
    if (!cameras) return [];

    return Object.entries(cameras).map(([id, camera]) => ({
      id,
      counters: this.entries(camera.counters),
      durations: this.entries(camera.durations),
    }));
  });
  protected readonly registrationCountEntries = computed(() =>
    this.entries(this.stats()?.registration.counts),
  );
  protected readonly registrationQueueEntries = computed(() =>
    this.entries(this.stats()?.registration.queue),
  );
  protected readonly registrationDurationEntries = computed(() =>
    this.entries(this.stats()?.registration.durations),
  );

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.loading.set(true);
    this.error.set(null);

    this.statsService.getStats().subscribe({
      next: (response) => {
        this.stats.set(response);
        this.loading.set(false);
      },
      error: (error: { message?: string }) => {
        this.loading.set(false);
        this.error.set(error.message ?? 'Falha ao carregar as métricas do sistema.');
        this.logger.error('Falha ao carregar métricas do sistema', error);
        toast.error('Falha ao carregar as métricas do sistema.');
      },
    });
  }

  protected anprQueueValue(key: string): number | null {
    return this.stats()?.anpr.performance.data?.queue?.[key] ?? null;
  }

  protected registrationCount(key: string): number | null {
    return this.stats()?.registration.counts?.[key] ?? null;
  }

  protected anprQueueLabel(key: string): string {
    return ANPR_QUEUE_LABELS[key] ?? key;
  }

  protected anprCounterLabel(key: string): string {
    return ANPR_COUNTER_LABELS[key] ?? key;
  }

  protected anprDurationLabel(key: string): string {
    return ANPR_DURATION_LABELS[key] ?? key;
  }

  protected registrationCountLabel(key: string): string {
    return REGISTRATION_COUNT_LABELS[key] ?? key;
  }

  protected registrationQueueLabel(key: string): string {
    return REGISTRATION_QUEUE_LABELS[key] ?? key;
  }

  protected registrationDurationLabel(key: string): string {
    return REGISTRATION_DURATION_LABELS[key] ?? key;
  }

  protected observationStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmada';
      case 'candidate':
        return 'Candidata';
      case 'expired':
        return 'Expirada';
      default:
        return status;
    }
  }

  protected observationBadgeType(status: string): BadgeType {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'candidate':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  protected formatCounter(key: string, value: number): string {
    return key === 'snapshot_bytes' ? this.formatBytes(value) : this.formatNumber(value);
  }

  protected formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return value.toLocaleString('pt-BR');
  }

  protected formatMs(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    if (value >= 1000) {
      return `${(value / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} s`;
    }
    return `${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ms`;
  }

  protected formatBytes(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${units[unit]}`;
  }

  protected formatUptime(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';

    const total = Math.floor(seconds);
    const days = Math.floor(total / 86_400);
    const hours = Math.floor((total % 86_400) / 3_600);
    const minutes = Math.floor((total % 3_600) / 60);
    const secs = total % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${secs}s`;
    return `${secs}s`;
  }

  protected formatConfidence(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—';
    return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  protected formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private entries<T>(record?: Record<string, T> | null): { key: string; value: T }[] {
    return record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];
  }
}
