import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';
import { interval } from 'rxjs';

import { SessionService } from '@/shared/core/auth';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { ZardSelectImports } from '@/shared/components/select';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { ZardTableImports } from '@/shared/components/table';
import { AnprService } from '@/shared/services/anpr.service';
import { CompanyService } from '@/shared/services/company.service';
import { LoggerService } from '@/shared/services/logger.service';
import { StatsService } from '@/shared/services/stats.service';
import type {
  AnprDurationSummary,
  Company,
  ExternalInteractionFilters,
  ExternalInteractionSummary,
  RegistrationDurationSummary,
  StatsFilters,
  SystemStatsResponse,
} from '@/shared/models';

import {
  FunnelChart,
  LatencyBars,
  LatencyRange,
  MetricTile,
  PipelineTimeline,
  QueueStatus,
  type FunnelStep,
  type LatencyBarItem,
  type LatencyRangeItem,
  type PipelineMilestone,
  type PipelineSegment,
  type StatTone,
} from './components';
import {
  formatBytes,
  formatConfidence,
  formatCurrency,
  formatDateTime,
  formatMs,
  formatNumber,
  formatRatio,
  formatTime,
  formatUptime,
} from './stats-format';

type BadgeType = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusInfo {
  label: string;
  tone: StatTone;
  badgeType: BadgeType;
}

interface QualitySlice {
  key: string;
  label: string;
  value: number;
  tone: string;
  share: number;
}

interface CameraRow {
  id: string;
  name: string;
  samples: number | null;
  recognitionP50: number | null;
  recognitionP95: number | null;
  inferenceP50: number | null;
  min: number | null;
  max: number | null;
}

const REFRESH_INTERVAL_MS = 30_000;

/** Referências visuais (não são SLA): até 2 s rápido, até 5 s atenção. */
const FAST_MS = 2_000;
const WATCH_MS = 5_000;

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

const QUALITY_TONES: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground/40',
  info: 'bg-info',
};

/**
 * Painel de observabilidade do reconhecimento ANPR e do registro automático.
 * O foco é o tempo ponta a ponta: captura do frame → veículo reconhecido →
 * movimento registrado, com detalhamento por etapa, fila e câmera.
 */
@Component({
  selector: 'app-system-stats',
  imports: [
    RouterLink,
    SiteHeader,
    LoadingSpinner,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardSelectImports,
    ZardSwitchComponent,
    ZardTableImports,
    FunnelChart,
    LatencyBars,
    LatencyRange,
    MetricTile,
    PipelineTimeline,
    QueueStatus,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <span
            class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            <ng-icon name="lucideActivity" aria-hidden="true" class="size-3.5" />
            Observabilidade
          </span>
          <h1 class="text-xl font-semibold tracking-tight">Tempo de reconhecimento e registro</h1>
          <p class="max-w-2xl text-sm text-muted-foreground">
            Do frame capturado ao movimento criado: onde o tempo é gasto, quais filas seguram o
            fluxo e como cada câmera se comporta.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span
            class="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          >
            <span class="relative flex size-2" aria-hidden="true">
              <span
                class="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-reduce:animate-none"
                [class.animate-ping]="autoRefresh()"
              ></span>
              <span class="relative inline-flex size-2 rounded-full bg-success"></span>
            </span>
            @if (autoRefresh()) {
              atualiza a cada 30 s
            } @else {
              atualização manual
            }
            @if (stats()?.timestamp; as timestamp) {
              <span class="text-foreground/70">· {{ formatTime(timestamp) }}</span>
            }
          </span>

          <span class="flex items-center gap-2 text-xs text-muted-foreground">
            <z-switch
              zSize="sm"
              zAriaLabel="Atualização automática a cada 30 segundos"
              [checked]="autoRefresh()"
              (checkedChange)="autoRefresh.set($event)"
            />
            Auto
          </span>

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

      <z-card>
        <div class="flex flex-wrap items-end gap-3 p-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Empresa</span>
            <z-select
              [(zValue)]="filtroCompanyId"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todas"
              class="w-56"
            >
              @if (isRoot()) {
                <z-select-item zValue="">Todas</z-select-item>
              }
              @for (empresa of empresas(); track empresa.id) {
                <z-select-item [zValue]="empresa.id">{{ empresa.name }}</z-select-item>
              }
            </z-select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">De</span>
            <input
              z-input
              type="date"
              class="w-40"
              [value]="filtroDateFrom()"
              (change)="onDateChange('from', $event)"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Até</span>
            <input
              z-input
              type="date"
              class="w-40"
              [value]="filtroDateTo()"
              (change)="onDateChange('to', $event)"
            />
          </label>

          <button z-button zType="ghost" zSize="sm" type="button" (click)="limparFiltros()">
            <ng-icon name="lucideX" aria-hidden="true" />
            Limpar filtros
          </button>

          <p class="ml-auto max-w-md text-xs leading-snug text-muted-foreground">
            A empresa filtra monitores, observações e métricas por câmera. As datas filtram as
            observações e o uso de APIs externas. Contadores do ANPR e do registro automático são
            globais desde o início do processo.
          </p>
        </div>
      </z-card>

      @if (!stats() && loading()) {
        <z-card>
          <div class="flex items-center justify-center py-16">
            <gp-loading-spinner message="Carregando métricas..." />
          </div>
        </z-card>
      }

      @if (stats(); as s) {
        <section
          aria-label="Indicadores principais"
          class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <gp-metric-tile
            label="Reconhecimento do veículo"
            [value]="formatMs(recognition()?.p50)"
            valueHint="p50"
            [hint]="recognitionHint()"
            icon="lucideScanLine"
            [tone]="recognitionStatus().tone"
            [badge]="recognitionStatus().label"
            [badgeType]="recognitionStatus().badgeType"
          />

          <gp-metric-tile
            label="Movimento registrado"
            [value]="formatMs(registrationTotal()?.p50)"
            valueHint="p50"
            [hint]="registrationHint()"
            icon="lucideCircleCheckBig"
            [tone]="registrationStatus().tone"
            [badge]="registrationStatus().label"
            [badgeType]="registrationStatus().badgeType"
          />

          <gp-metric-tile
            label="Processamento no registro"
            [value]="formatMs(processingDuration()?.p50)"
            valueHint="p50"
            [hint]="processingHint()"
            icon="lucideServer"
            tone="info"
          />

          <gp-metric-tile
            label="Movimentos registrados"
            [value]="formatNumber(registrationCount('registered'))"
            valueHint="desde o início"
            [hint]="registeredHint()"
            icon="lucideCheckCircle"
            tone="success"
          />
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="pipeline-heading">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div class="flex flex-col gap-0.5">
              <h2 id="pipeline-heading" class="text-base font-semibold">Do frame ao movimento</h2>
              <p class="text-sm text-muted-foreground">
                Mediana por etapa e totais medidos entre a captura e a conclusão do registro.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              @if (windowCapacity(); as capacity) {
                <z-badge zType="outline" zShape="pill">
                  Janela móvel · {{ formatNumber(capacity) }} amostras
                </z-badge>
              }
              <z-badge zType="outline" zShape="pill">
                Unidade: {{ s.registration.durationUnit ?? 'ms' }}
              </z-badge>
              <span class="text-xs text-muted-foreground">
                Referência visual: até {{ formatMs(FAST_MS) }} rápido · até
                {{ formatMs(WATCH_MS) }} atenção
              </span>
            </div>
          </div>

          <div class="grid gap-3 xl:grid-cols-3">
            <z-card class="xl:col-span-2">
              <div
                class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
              >
                <div>
                  <h3 class="text-sm font-medium">Linha do tempo</h3>
                  <p class="text-xs text-muted-foreground">
                    Reconhecimento no ANPR e registro automático no Nest.
                  </p>
                </div>
                <ng-icon
                  name="lucideWorkflow"
                  aria-hidden="true"
                  class="size-4 text-muted-foreground"
                />
              </div>

              <div class="p-4">
                <gp-pipeline-timeline
                  [segments]="pipelineSegments()"
                  [recognition]="recognition()"
                  [registration]="registrationTotal()"
                />
              </div>
            </z-card>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <gp-queue-status
                title="Fila de inferência"
                icon="lucideInbox"
                [pending]="anprQueueValue('pending') ?? 0"
                [active]="anprQueueValue('active') ?? 0"
                [capacity]="anprQueueValue('capacity')"
                [workers]="anprQueueValue('workers')"
                hint="Aguardando uma vaga no worker de OCR do serviço ANPR."
              />

              <gp-queue-status
                title="Fila de registro"
                icon="lucideServer"
                [pending]="registrationQueueValue('pending') ?? 0"
                [active]="registrationQueueValue('active') ?? 0"
                [capacity]="registrationQueueValue('maxPending')"
                [workers]="registrationQueueValue('concurrency')"
                hint="Observações aguardando processamento no registro automático."
              />
            </div>
          </div>
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="latency-heading">
          <div class="flex flex-col gap-0.5">
            <h2 id="latency-heading" class="text-base font-semibold">Onde o tempo é gasto</h2>
            <p class="text-sm text-muted-foreground">
              Comparação entre mediana e cauda (p95) de cada etapa, na mesma escala.
            </p>
          </div>

          <div class="grid gap-3 xl:grid-cols-2">
            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h3 class="text-sm font-medium">Latência por etapa</h3>
                <p class="text-xs text-muted-foreground">
                  Etapas do reconhecimento e do registro, incluindo os totais ponta a ponta.
                </p>
              </div>
              <div class="p-4">
                <gp-latency-bars
                  [items]="latencyItems()"
                  ariaLabel="Latência mediana e p95 por etapa"
                />
              </div>
            </z-card>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h3 class="text-sm font-medium">Dispersão do reconhecimento</h3>
                <p class="text-xs text-muted-foreground">
                  Faixa mínima–máxima observada em cada etapa do serviço ANPR.
                </p>
              </div>
              <div class="p-4">
                <gp-latency-range
                  [items]="rangeItems()"
                  ariaLabel="Faixa mínima, mediana, p95 e máxima do reconhecimento"
                />
              </div>
            </z-card>
          </div>
        </section>

        <section class="grid gap-3 xl:grid-cols-3" aria-label="Volume e qualidade">
          <z-card>
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
            >
              <div>
                <h2 class="flex items-center gap-2 text-sm font-medium">
                  <ng-icon
                    name="lucideWorkflow"
                    aria-hidden="true"
                    class="size-4 text-muted-foreground"
                  />
                  Jornada do registro
                </h2>
                <p class="text-xs text-muted-foreground">
                  Eventos recebidos até movimentos efetivamente criados.
                </p>
              </div>
              <ng-icon
                name="lucideTrendingUp"
                aria-hidden="true"
                class="size-4 text-muted-foreground"
              />
            </div>
            <div class="p-4">
              <gp-funnel-chart
                [steps]="registrationFunnel()"
                ariaLabel="Funil de eventos até movimentos registrados"
              />
            </div>
            <p class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Contadores globais desde {{ formatDateTime(s.registration.startedAt) }}. Não são
              afetados pelos filtros de empresa e data.
            </p>
          </z-card>

          <z-card>
            <div class="border-b border-border px-4 py-3">
              <h2 class="flex items-center gap-2 text-sm font-medium">
                <ng-icon
                  name="lucideTarget"
                  aria-hidden="true"
                  class="size-4 text-muted-foreground"
                />
                Qualidade do reconhecimento
              </h2>
              <p class="text-xs text-muted-foreground">
                Resultado das inferências enviadas pelo serviço ANPR.
              </p>
            </div>

            <div class="flex flex-col gap-4 p-4">
              <div class="flex flex-wrap items-baseline gap-2">
                <span class="text-3xl font-semibold tracking-tight tabular-nums">
                  {{ formatRatio(recognitionQuality().rate) }}
                </span>
                <span class="text-xs text-muted-foreground">
                  de {{ formatNumber(recognitionQuality().submitted) }} inferências resultaram em
                  placa
                </span>
              </div>

              @if (recognitionQuality().total > 0) {
                <div
                  class="flex h-3 w-full overflow-hidden rounded-full bg-muted"
                  role="img"
                  [attr.aria-label]="recognitionQualityLabel()"
                >
                  @for (slice of recognitionSlices(); track slice.key) {
                    @if (slice.value > 0) {
                      <div
                        [class]="slice.tone"
                        class="h-full"
                        [style.width.%]="slice.share"
                        [attr.title]="slice.label + ': ' + formatNumber(slice.value)"
                      ></div>
                    }
                  }
                </div>

                <ul class="grid grid-cols-2 gap-x-4 gap-y-2">
                  @for (slice of recognitionSlices(); track slice.key) {
                    <li class="flex items-center justify-between gap-2 text-xs">
                      <span class="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <span
                          [class]="slice.tone"
                          class="size-2 shrink-0 rounded-full"
                          aria-hidden="true"
                        ></span>
                        <span class="truncate">{{ slice.label }}</span>
                      </span>
                      <span class="shrink-0 font-medium tabular-nums text-foreground">
                        {{ formatNumber(slice.value) }}
                      </span>
                    </li>
                  }
                </ul>
              } @else {
                <p
                  class="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  Nenhuma inferência contabilizada desde o início do processo.
                </p>
              }
            </div>

            <p class="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              {{ formatNumber(recognitionQuality().skipped) }} inferências ignoradas por cena
              estática · {{ formatNumber(recognitionQuality().manualTimeout) }} timeouts manuais.
            </p>
          </z-card>

          <z-card>
            <div
              class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
            >
              <div>
                <h2 class="flex items-center gap-2 text-sm font-medium">
                  <ng-icon
                    name="lucideActivity"
                    aria-hidden="true"
                    class="size-4 text-muted-foreground"
                  />
                  APIs externas
                </h2>
                <p class="text-xs text-muted-foreground">
                  Chamadas no período filtrado, no escopo da empresa.
                </p>
              </div>
              @if (isRoot()) {
                <a z-button zType="outline" zSize="sm" routerLink="/anpr/uso-externo">Detalhes</a>
              }
            </div>

            @if (externalLoading()) {
              <p class="px-4 py-8 text-center text-sm text-muted-foreground">
                Carregando uso externo...
              </p>
            } @else if (externalSummary(); as ext) {
              <div class="grid grid-cols-2 gap-3 p-4">
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Chamadas</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatNumber(ext.calls) }}
                  </div>
                </div>
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Sucessos</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatNumber(ext.success) }}
                  </div>
                </div>
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Latência média</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatMs(ext.avgLatencyMs) }}
                  </div>
                </div>
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Latência p95</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatMs(ext.p95LatencyMs) }}
                  </div>
                </div>
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Falhas</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatNumber(ext.failures) }}
                  </div>
                </div>
                <div class="rounded-lg border border-border p-3">
                  <div class="text-xs text-muted-foreground">Custo total</div>
                  <div class="text-lg font-semibold tabular-nums">
                    {{ formatCurrency(ext.totalCost, ext.costCurrency) }}
                  </div>
                </div>
              </div>
            } @else {
              <p class="px-4 py-8 text-center text-sm text-muted-foreground">
                Uso de APIs externas indisponível para os filtros selecionados.
              </p>
            }
          </z-card>
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="cameras-heading">
          <div class="flex flex-col gap-0.5">
            <h2 id="cameras-heading" class="text-base font-semibold">Por câmera</h2>
            <p class="text-sm text-muted-foreground">
              Câmeras com maior mediana de captura → resultado aparecem primeiro.
            </p>
          </div>

          <div class="grid gap-3 xl:grid-cols-2">
            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h3 class="text-sm font-medium">Câmeras mais lentas</h3>
                <p class="text-xs text-muted-foreground">
                  Mediana e p95 do tempo até o reconhecimento (top 8).
                </p>
              </div>
              <div class="p-4">
                <gp-latency-bars
                  [items]="cameraLatencyItems()"
                  ariaLabel="Latência de reconhecimento por câmera"
                />
              </div>
            </z-card>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h3 class="text-sm font-medium">Resumo por câmera</h3>
                <p class="text-xs text-muted-foreground">
                  Amostras, reconhecimento e inferência de cada câmera ativa recentemente.
                </p>
              </div>

              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Câmera</th>
                      <th z-table-head class="text-right">Amostras</th>
                      <th z-table-head class="text-right">p50</th>
                      <th z-table-head class="text-right">p95</th>
                      <th z-table-head class="text-right">Inferência</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (camera of cameraRows(); track camera.id) {
                      <tr z-table-row>
                        <td z-table-cell class="max-w-[16rem] truncate font-mono text-xs">
                          {{ camera.name }}
                        </td>
                        <td z-table-cell class="text-right tabular-nums">
                          {{ formatNumber(camera.samples) }}
                        </td>
                        <td z-table-cell class="text-right tabular-nums">
                          {{ formatMs(camera.recognitionP50) }}
                        </td>
                        <td z-table-cell class="text-right tabular-nums">
                          {{ formatMs(camera.recognitionP95) }}
                        </td>
                        <td z-table-cell class="text-right tabular-nums">
                          {{ formatMs(camera.inferenceP50) }}
                        </td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td
                          z-table-cell
                          colspan="5"
                          class="py-10 text-center text-muted-foreground"
                        >
                          Nenhuma câmera com métricas registradas.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </z-card>
          </div>
        </section>

        <section class="grid gap-3 xl:grid-cols-3" aria-label="Infraestrutura">
          <z-card class="xl:col-span-2">
            <div class="border-b border-border px-4 py-3">
              <h2 class="flex items-center gap-2 text-sm font-medium">
                <ng-icon
                  name="lucideServer"
                  aria-hidden="true"
                  class="size-4 text-muted-foreground"
                />
                Saúde do serviço ANPR
              </h2>
              <p class="text-xs text-muted-foreground">
                Disponibilidade dos monitores e das consultas de observações.
              </p>
            </div>

            <div class="flex flex-wrap gap-2 border-b border-border px-4 py-3">
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

            <div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="rounded-lg border border-border p-3">
                <div class="text-xs text-muted-foreground">Monitores ativos</div>
                <div class="text-lg font-semibold tabular-nums">
                  {{ formatNumber(s.anpr.activeMonitors) }}
                </div>
              </div>
              <div class="rounded-lg border border-border p-3">
                <div class="text-xs text-muted-foreground">Observações confirmadas</div>
                <div class="text-lg font-semibold tabular-nums">
                  {{ formatNumber(s.anpr.confirmedObservations.length) }}
                </div>
              </div>
              <div class="rounded-lg border border-border p-3">
                <div class="text-xs text-muted-foreground">Uptime</div>
                <div class="text-lg font-semibold tabular-nums">
                  {{ formatUptime(anprData()?.uptime_seconds) }}
                </div>
              </div>
              <div class="rounded-lg border border-border p-3">
                <div class="text-xs text-muted-foreground">Versão das métricas</div>
                <div class="text-lg font-semibold tabular-nums">
                  v{{ anprData()?.version ?? '—' }}
                </div>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Segmentação dos filtros</h2>
              <p class="text-xs text-muted-foreground">
                O que muda com a empresa e as datas selecionadas.
              </p>
            </div>
            <div class="flex flex-col gap-3 p-4 text-xs">
              <div>
                <div class="font-medium text-foreground">Filtrado</div>
                <p class="text-muted-foreground">
                  {{ s.scope.filtered.length ? s.scope.filtered.join(', ') : 'nada' }}
                </p>
              </div>
              <div>
                <div class="font-medium text-foreground">Global</div>
                <p class="text-muted-foreground">
                  {{ s.scope.global.length ? s.scope.global.join(', ') : 'nada' }}
                </p>
              </div>
              @if (s.registration.countersScope) {
                <div>
                  <div class="font-medium text-foreground">Escopo dos contadores</div>
                  <p class="text-muted-foreground">{{ s.registration.countersScope }}</p>
                </div>
              }
            </div>
          </z-card>
        </section>

        <z-card>
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"
          >
            <div>
              <h2 class="text-sm font-medium">Observações confirmadas</h2>
              <p class="text-xs text-muted-foreground">
                Últimas leituras confirmadas pelo serviço ANPR nas câmeras monitoradas.
              </p>
            </div>
            <z-badge zType="outline" zShape="pill">
              {{ formatNumber(s.anpr.confirmedObservations.length) }} leituras
            </z-badge>
          </div>

          <div class="overflow-x-auto">
            <table z-table>
              <thead z-table-header>
                <tr z-table-row>
                  <th z-table-head>Câmera</th>
                  <th z-table-head>Empresa</th>
                  <th z-table-head>Placa</th>
                  <th z-table-head class="w-40">Confiança</th>
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
                    <td z-table-cell class="whitespace-nowrap">
                      {{ nomeEmpresa(observation.companyId) }}
                    </td>
                    <td z-table-cell class="font-mono font-medium">
                      {{ observation.plate ?? '—' }}
                    </td>
                    <td z-table-cell>
                      <div class="flex items-center gap-2">
                        <div
                          class="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          [attr.aria-valuenow]="confidencePercent(observation.confidence)"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          [attr.aria-label]="
                            'Confiança ' + formatConfidence(observation.confidence)
                          "
                        >
                          <div
                            class="h-full rounded-full bg-primary"
                            [style.width.%]="confidencePercent(observation.confidence)"
                          ></div>
                        </div>
                        <span class="text-xs tabular-nums text-muted-foreground">
                          {{ formatConfidence(observation.confidence) }}
                        </span>
                      </div>
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
                    <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                      Nenhuma observação confirmada no momento.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </z-card>

        <z-card>
          <details class="group">
            <summary
              class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <h2 class="text-sm font-medium">Detalhes técnicos</h2>
                <p class="text-xs text-muted-foreground">
                  Contadores, janelas e métricas brutas por câmera.
                </p>
              </div>
              <ng-icon
                name="lucideChevronDown"
                aria-hidden="true"
                class="size-4 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>

            <div class="flex flex-col gap-6 border-t border-border p-4">
              <div class="grid gap-6 xl:grid-cols-2">
                <div class="overflow-x-auto">
                  <h3 class="mb-2 text-sm font-medium">Contadores ANPR</h3>
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
                          <td z-table-cell class="text-right font-medium tabular-nums">
                            {{ formatCounter(entry.key, entry.value) }}
                          </td>
                        </tr>
                      } @empty {
                        <tr z-table-row>
                          <td
                            z-table-cell
                            colspan="2"
                            class="py-6 text-center text-muted-foreground"
                          >
                            Nenhum contador disponível.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="overflow-x-auto">
                  <h3 class="mb-2 text-sm font-medium">Durações ANPR</h3>
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
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatNumber(entry.value.window_count) }}
                          </td>
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatMs(entry.value.avg_ms) }}
                          </td>
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatMs(entry.value.p50_ms) }}
                          </td>
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatMs(entry.value.p95_ms) }}
                          </td>
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatMs(entry.value.min_ms) }}
                          </td>
                          <td z-table-cell class="text-right tabular-nums">
                            {{ formatMs(entry.value.max_ms) }}
                          </td>
                        </tr>
                      } @empty {
                        <tr z-table-row>
                          <td
                            z-table-cell
                            colspan="7"
                            class="py-6 text-center text-muted-foreground"
                          >
                            Nenhuma duração amostrada.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="grid gap-6 xl:grid-cols-2">
                <div class="overflow-x-auto">
                  <h3 class="mb-2 text-sm font-medium">Contadores do registro</h3>
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
                          <td z-table-cell class="text-right font-medium tabular-nums">
                            {{ formatNumber(entry.value) }}
                          </td>
                        </tr>
                      } @empty {
                        <tr z-table-row>
                          <td
                            z-table-cell
                            colspan="2"
                            class="py-6 text-center text-muted-foreground"
                          >
                            Nenhum contador disponível.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="flex flex-col gap-4">
                  <div class="overflow-x-auto">
                    <h3 class="mb-2 text-sm font-medium">Durações do registro</h3>
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
                            <td z-table-cell class="text-right tabular-nums">
                              {{ formatNumber(entry.value.count) }}
                            </td>
                            <td z-table-cell class="text-right tabular-nums">
                              {{ formatMs(entry.value.avg) }}
                            </td>
                            <td z-table-cell class="text-right tabular-nums">
                              {{ formatMs(entry.value.p50) }}
                            </td>
                            <td z-table-cell class="text-right tabular-nums">
                              {{ formatMs(entry.value.p95) }}
                            </td>
                            <td z-table-cell class="text-right tabular-nums">
                              {{ formatMs(entry.value.max) }}
                            </td>
                          </tr>
                        } @empty {
                          <tr z-table-row>
                            <td
                              z-table-cell
                              colspan="6"
                              class="py-6 text-center text-muted-foreground"
                            >
                              Nenhuma duração amostrada.
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    @for (entry of registrationQueueEntries(); track entry.key) {
                      <div class="rounded-lg border border-border p-3">
                        <div class="text-xs text-muted-foreground">
                          {{ registrationQueueLabel(entry.key) }}
                        </div>
                        <div class="text-lg font-semibold tabular-nums">
                          {{ formatNumber(entry.value) }}
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <h3 class="text-sm font-medium">Métricas por câmera</h3>
                <div class="flex flex-col divide-y divide-border rounded-lg border border-border">
                  @for (camera of cameraEntries(); track camera.id) {
                    <details class="group/camera">
                      <summary
                        class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/50"
                      >
                        <span class="font-mono">{{ camera.id }}</span>
                        <span class="flex items-center gap-2 text-xs text-muted-foreground">
                          {{ formatNumber(camera.counters.length) }} contadores ·
                          {{ formatNumber(camera.durations.length) }} durações
                          <ng-icon
                            name="lucideChevronDown"
                            aria-hidden="true"
                            class="size-3.5 transition-transform group-open/camera:rotate-180"
                          />
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
                                  <td z-table-cell class="text-right font-medium tabular-nums">
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
                                  <td z-table-cell class="text-right tabular-nums">
                                    {{ formatNumber(entry.value.window_count) }}
                                  </td>
                                  <td z-table-cell class="text-right tabular-nums">
                                    {{ formatMs(entry.value.avg_ms) }}
                                  </td>
                                  <td z-table-cell class="text-right tabular-nums">
                                    {{ formatMs(entry.value.p95_ms) }}
                                  </td>
                                  <td z-table-cell class="text-right tabular-nums">
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
              </div>

              <p class="text-xs text-muted-foreground">
                Fila ANPR:
                {{ formatNumber(anprQueueValue('pending')) }} aguardando ·
                {{ formatNumber(anprQueueValue('active')) }} em execução ·
                {{ formatNumber(anprQueueValue('workers')) }} workers. Contadores do ANPR e do
                registro são acumulados desde o início do processo.
              </p>
            </div>
          </details>
        </z-card>
      }
    </main>
  `,
})
export class SystemStats implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly anprService = inject(AnprService);
  private readonly companyService = inject(CompanyService);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly logger = inject(LoggerService).create('SystemStats');

  protected readonly stats = signal<SystemStatsResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly autoRefresh = signal(true);

  protected readonly empresas = signal<Company[]>([]);
  protected readonly externalSummary = signal<ExternalInteractionSummary | null>(null);
  protected readonly externalLoading = signal(false);
  protected readonly isRoot = computed(() => this.session.usuario()?.companyId === null);

  protected readonly filtroCompanyId = signal('');
  protected readonly filtroDateFrom = signal('');
  protected readonly filtroDateTo = signal('');

  protected readonly FAST_MS = FAST_MS;
  protected readonly WATCH_MS = WATCH_MS;

  protected readonly anprData = computed(() => this.stats()?.anpr.performance.data ?? null);
  protected readonly registration = computed(() => this.stats()?.registration ?? null);
  protected readonly anprCounters = computed(() => this.anprData()?.counters ?? {});
  protected readonly anprQueue = computed(() => this.anprData()?.queue ?? {});
  protected readonly registrationCounts = computed(() => this.registration()?.counts ?? {});
  protected readonly registrationQueue = computed(() => this.registration()?.queue ?? {});

  protected readonly windowCapacity = computed(() => this.anprData()?.window_capacity ?? null);

  protected readonly recognition = computed<PipelineMilestone | null>(() => {
    const duration = this.anprDuration('capture_to_result');
    if (duration) {
      return { p50: duration.p50_ms, p95: duration.p95_ms, samples: duration.window_count };
    }

    const legacy = this.anprData();
    if (legacy?.p50_ms !== null && legacy?.p50_ms !== undefined) {
      return {
        p50: legacy.p50_ms,
        p95: legacy.p95_ms ?? null,
        samples: legacy.window_count ?? legacy.count ?? null,
      };
    }
    return null;
  });

  protected readonly registrationTotal = computed<PipelineMilestone | null>(() => {
    const duration = this.registrationDuration('captureToRegistration');
    if (!duration) return null;
    return { p50: duration.p50, p95: duration.p95, samples: duration.count };
  });

  protected readonly processingDuration = computed(() => this.registrationDuration('processing'));

  protected readonly recognitionStatus = computed<StatusInfo>(() =>
    this.statusFor(this.recognition()?.p50),
  );

  protected readonly registrationStatus = computed<StatusInfo>(() =>
    this.statusFor(this.registrationTotal()?.p50),
  );

  protected readonly recognitionHint = computed(() => {
    const value = this.recognition();
    if (!value) return 'Sem amostras de captura → resultado';
    const parts = [`p95 ${formatMs(value.p95)}`];
    if (value.samples !== null) parts.push(`${formatNumber(value.samples)} amostras`);
    return parts.join(' · ');
  });

  protected readonly registrationHint = computed(() => {
    const value = this.registrationTotal();
    if (!value) return 'Nenhum registro concluído na janela';
    const parts = [`p95 ${formatMs(value.p95)}`];
    if (value.samples !== null) parts.push(`${formatNumber(value.samples)} registros`);
    return parts.join(' · ');
  });

  protected readonly processingHint = computed(() => {
    const processing = this.processingDuration();
    const queueWait = this.registrationDuration('queueWait');
    if (!processing) return 'Sem amostras de processamento';
    const parts = [`p95 ${formatMs(processing.p95)}`];
    if (queueWait) parts.push(`fila ${formatMs(queueWait.p50)}`);
    return `${parts.join(' · ')} · ${formatNumber(processing.count)} amostras`;
  });

  protected readonly registeredHint = computed(() => {
    const errors = this.registrationCount('errors') ?? 0;
    const waiting = this.registrationCount('waitingConfirmation') ?? 0;
    const ignored = this.registrationCount('ignored') ?? 0;
    return `${formatNumber(errors)} erros · ${formatNumber(waiting)} aguardando confirmação · ${formatNumber(ignored)} ignorados`;
  });

  protected readonly pipelineSegments = computed<PipelineSegment[]>(() => {
    const segments: PipelineSegment[] = [];
    const frameAge = this.anprDuration('frame_age');
    const inference = this.anprDuration('inference');

    if (frameAge && frameAge.window_count > 0) {
      segments.push({
        key: 'frame_age',
        label: 'Espera até a inferência',
        ms: frameAge.p50_ms,
        tone: 'chart2',
      });
    }
    if (inference && inference.window_count > 0) {
      segments.push({
        key: 'inference',
        label: 'Inferência',
        ms: inference.p50_ms,
        tone: 'chart3',
      });
    }

    if (segments.length === 0) {
      const recognition = this.recognition();
      if (recognition?.p50 !== null && recognition?.p50 !== undefined) {
        segments.push({
          key: 'recognition',
          label: 'Captura → reconhecimento',
          ms: recognition.p50,
          tone: 'chart2',
        });
      }
    }

    const queueWait = this.registrationDuration('queueWait');
    const processing = this.registrationDuration('processing');
    if (queueWait?.p50 !== null && queueWait?.p50 !== undefined) {
      segments.push({
        key: 'registration_queue',
        label: 'Fila de registro',
        ms: queueWait.p50,
        tone: 'chart4',
      });
    }
    if (processing?.p50 !== null && processing?.p50 !== undefined) {
      segments.push({
        key: 'registration_processing',
        label: 'Processamento do registro',
        ms: processing.p50,
        tone: 'chart5',
      });
    }

    return segments;
  });

  protected readonly latencyItems = computed<LatencyBarItem[]>(() => {
    const items: LatencyBarItem[] = [];

    const addAnpr = (
      key: string,
      label: string,
      hint: string,
      tone: LatencyBarItem['tone'],
      emphasis = false,
    ) => {
      const duration = this.anprDuration(key);
      if (!duration || duration.window_count <= 0) return;
      items.push({
        key,
        label,
        hint,
        p50: duration.p50_ms,
        p95: duration.p95_ms,
        samples: duration.window_count,
        tone,
        emphasis,
      });
    };

    addAnpr('frame_age', 'Espera até a inferência', 'idade do frame', 'chart2');
    addAnpr('inference', 'Inferência', 'YOLO + OCR', 'chart3');
    addAnpr('capture_to_result', 'Captura → reconhecimento', 'total ANPR', 'primary', true);

    const addRegistration = (
      key: string,
      label: string,
      hint: string,
      tone: LatencyBarItem['tone'],
      emphasis = false,
    ) => {
      const duration = this.registrationDuration(key);
      if (!duration || duration.count <= 0) return;
      items.push({
        key,
        label,
        hint,
        p50: duration.p50,
        p95: duration.p95,
        samples: duration.count,
        tone,
        emphasis,
      });
    };

    addRegistration('queueWait', 'Fila de registro', 'espera no Nest', 'chart4');
    addRegistration('processing', 'Processamento do registro', 'no Nest', 'chart5');
    addRegistration(
      'captureToRegistration',
      'Captura → movimento registrado',
      'total ponta a ponta',
      'success',
      true,
    );

    return items;
  });

  protected readonly rangeItems = computed<LatencyRangeItem[]>(() => {
    const items: LatencyRangeItem[] = [];
    const add = (key: string, label: string, hint: string) => {
      const duration = this.anprDuration(key);
      if (!duration || duration.window_count <= 0) return;
      items.push({
        key,
        label,
        hint,
        min: duration.min_ms,
        p50: duration.p50_ms,
        p95: duration.p95_ms,
        max: duration.max_ms,
        samples: duration.window_count,
      });
    };

    add('frame_age', 'Espera até a inferência', 'idade do frame');
    add('queue_wait', 'Espera na fila ANPR', 'antes do worker');
    add('inference', 'Inferência', 'YOLO + OCR');
    add('capture_to_result', 'Captura → reconhecimento', 'total ANPR');
    return items;
  });

  protected readonly cameraNames = computed(() => {
    const names = new Map<string, string>();
    for (const observation of this.stats()?.anpr.confirmedObservations ?? []) {
      if (observation.cameraName) names.set(observation.cameraId, observation.cameraName);
    }
    return names;
  });

  protected readonly cameraRows = computed<CameraRow[]>(() => {
    const cameras = this.anprData()?.cameras;
    if (!cameras) return [];

    return Object.entries(cameras)
      .map(([id, camera]) => {
        const recognition = camera.durations?.['capture_to_result'] ?? null;
        const fallback = camera.durations?.['inference'] ?? null;
        const summary = recognition ?? fallback;
        return {
          id,
          name: this.cameraNames().get(id) ?? id,
          samples: summary?.window_count ?? null,
          recognitionP50: recognition?.p50_ms ?? null,
          recognitionP95: recognition?.p95_ms ?? null,
          inferenceP50: camera.durations?.['inference']?.p50_ms ?? null,
          min: recognition?.min_ms ?? null,
          max: recognition?.max_ms ?? null,
        };
      })
      .filter((camera) => camera.samples !== null)
      .sort((a, b) => (b.recognitionP50 ?? 0) - (a.recognitionP50 ?? 0));
  });

  protected readonly cameraLatencyItems = computed<LatencyBarItem[]>(() =>
    this.cameraRows()
      .slice(0, 8)
      .map((camera) => ({
        key: camera.id,
        label: camera.name,
        hint: camera.name === camera.id ? 'câmera' : camera.id.slice(0, 8),
        p50: camera.recognitionP50,
        p95: camera.recognitionP95,
        samples: camera.samples,
        tone:
          camera.recognitionP50 !== null && camera.recognitionP50 > WATCH_MS
            ? 'warning'
            : 'primary',
      })),
  );

  protected readonly recognitionQuality = computed(() => {
    const counters = this.anprCounters();
    const submitted = this.num(counters, 'submitted') ?? 0;
    const recognized = this.num(counters, 'recognized') ?? 0;
    const noPlate = this.num(counters, 'no_plate') ?? 0;
    const errors =
      (this.num(counters, 'inference_error') ?? 0) +
      (this.num(counters, 'capture_error') ?? 0) +
      (this.num(counters, 'callback_error') ?? 0);
    const expired =
      (this.num(counters, 'expired_before_inference') ?? 0) +
      (this.num(counters, 'expired_after_inference') ?? 0);
    const skipped = this.num(counters, 'scene_inference_skipped') ?? 0;
    const manualTimeout = this.num(counters, 'manual_timeout') ?? 0;
    const total = recognized + noPlate + errors + expired;

    return {
      submitted,
      recognized,
      noPlate,
      errors,
      expired,
      skipped,
      manualTimeout,
      total,
      rate: submitted > 0 ? recognized / submitted : null,
    };
  });

  protected readonly recognitionSlices = computed<QualitySlice[]>(() => {
    const quality = this.recognitionQuality();
    const total = quality.total;
    const share = (value: number) => (total > 0 ? (value / total) * 100 : 0);

    return [
      {
        key: 'recognized',
        label: 'Reconhecidas',
        value: quality.recognized,
        tone: QUALITY_TONES['success'],
        share: share(quality.recognized),
      },
      {
        key: 'no_plate',
        label: 'Sem placa',
        value: quality.noPlate,
        tone: QUALITY_TONES['warning'],
        share: share(quality.noPlate),
      },
      {
        key: 'errors',
        label: 'Erros',
        value: quality.errors,
        tone: QUALITY_TONES['destructive'],
        share: share(quality.errors),
      },
      {
        key: 'expired',
        label: 'Expiradas',
        value: quality.expired,
        tone: QUALITY_TONES['muted'],
        share: share(quality.expired),
      },
    ];
  });

  protected readonly recognitionQualityLabel = computed(() => {
    const quality = this.recognitionQuality();
    return `Reconhecidas ${formatNumber(quality.recognized)}, sem placa ${formatNumber(
      quality.noPlate,
    )}, erros ${formatNumber(quality.errors)}, expiradas ${formatNumber(quality.expired)}`;
  });

  protected readonly registrationFunnel = computed<FunnelStep[]>(() => {
    const counts = this.registrationCounts();
    const events = this.num(counts, 'events') ?? 0;
    const processed = this.num(counts, 'processed') ?? 0;
    const registered = this.num(counts, 'registered') ?? 0;

    if (events === 0 && processed === 0 && registered === 0) return [];

    const steps: FunnelStep[] = [
      {
        key: 'events',
        label: 'Eventos recebidos',
        value: events,
        hint: `${formatNumber(this.num(counts, 'reconnects') ?? 0)} reconexões · ${formatNumber(
          this.num(counts, 'resets') ?? 0,
        )} resets`,
      },
      {
        key: 'processed',
        label: 'Processados',
        value: processed,
        hint: `${formatNumber(this.num(counts, 'ignored') ?? 0)} ignorados · ${formatNumber(
          this.num(counts, 'errors') ?? 0,
        )} erros`,
      },
      {
        key: 'registered',
        label: 'Movimentos registrados',
        value: registered,
        hint: `${formatNumber(
          this.num(counts, 'waitingConfirmation') ?? 0,
        )} aguardando confirmação`,
      },
    ];

    return steps;
  });

  protected readonly anprCounterEntries = computed(() => this.entries(this.anprCounters()));
  protected readonly anprDurationEntries = computed(() => this.entries(this.anprData()?.durations));
  protected readonly registrationCountEntries = computed(() =>
    this.entries(this.registrationCounts()),
  );
  protected readonly registrationQueueEntries = computed(() =>
    this.entries(this.registrationQueue()),
  );
  protected readonly registrationDurationEntries = computed(() =>
    this.entries(this.registration()?.durations),
  );
  protected readonly cameraEntries = computed(() => {
    const cameras = this.anprData()?.cameras;
    if (!cameras) return [];

    return Object.entries(cameras).map(([id, camera]) => ({
      id,
      counters: this.entries(camera.counters),
      durations: this.entries(camera.durations),
    }));
  });

  ngOnInit(): void {
    const companyId = this.session.usuario()?.companyId;
    if (companyId) {
      this.filtroCompanyId.set(companyId);
    }
    this.carregarEmpresas();
    this.carregar();

    interval(REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.autoRefresh() && !this.loading()) this.carregar(false);
      });
  }

  protected onFiltroChange(): void {
    this.carregar();
  }

  protected onDateChange(campo: 'from' | 'to', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    if (campo === 'from') {
      this.filtroDateFrom.set(valor);
    } else {
      this.filtroDateTo.set(valor);
    }
    this.carregar();
  }

  protected limparFiltros(): void {
    this.filtroCompanyId.set(this.session.usuario()?.companyId ?? '');
    this.filtroDateFrom.set('');
    this.filtroDateTo.set('');
    this.carregar();
  }

  protected carregar(notificar = true): void {
    const companyId = this.filtroCompanyId();
    const dateFrom = this.filtroDateFrom();
    const dateTo = this.filtroDateTo();

    const statsFilters: StatsFilters = {};
    if (companyId) statsFilters.companyId = companyId;
    if (dateFrom) statsFilters.dateFrom = `${dateFrom}T00:00:00.000Z`;
    if (dateTo) statsFilters.dateTo = `${dateTo}T23:59:59.999Z`;

    this.loading.set(true);
    this.error.set(null);

    this.statsService.getStats(statsFilters).subscribe({
      next: (response) => {
        this.stats.set(response);
        this.loading.set(false);
      },
      error: (error: { message?: string }) => {
        this.loading.set(false);
        this.error.set(error.message ?? 'Falha ao carregar as métricas do sistema.');
        this.logger.error('Falha ao carregar métricas do sistema', error);
        if (notificar) toast.error('Falha ao carregar as métricas do sistema.');
      },
    });

    this.carregarUsoExterno(companyId, dateFrom, dateTo);
  }

  protected anprQueueValue(key: string): number | null {
    return this.num(this.anprQueue(), key);
  }

  protected registrationQueueValue(key: string): number | null {
    return this.num(this.registrationQueue(), key);
  }

  protected registrationCount(key: string): number | null {
    return this.num(this.registrationCounts(), key);
  }

  protected confidencePercent(value: number | null | undefined): number {
    if (value === null || value === undefined || !Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value * 100));
  }

  protected anprCounterLabel(key: string): string {
    return ANPR_COUNTER_LABELS[key] ?? key;
  }

  protected anprDurationLabel(key: string): string {
    return ANPR_DURATION_LABELS[key] ?? key;
  }

  protected anprQueueLabel(key: string): string {
    return ANPR_QUEUE_LABELS[key] ?? key;
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
    return key === 'snapshot_bytes' ? formatBytes(value) : formatNumber(value);
  }

  protected nomeEmpresa(companyId: string | null | undefined): string {
    if (!companyId) return '—';
    return this.empresas().find((empresa) => empresa.id === companyId)?.name ?? companyId;
  }

  protected readonly formatMs = formatMs;
  protected readonly formatNumber = formatNumber;
  protected readonly formatBytes = formatBytes;
  protected readonly formatUptime = formatUptime;
  protected readonly formatConfidence = formatConfidence;
  protected readonly formatCurrency = formatCurrency;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatTime = formatTime;
  protected readonly formatRatio = formatRatio;

  private statusFor(p50: number | null | undefined): StatusInfo {
    if (p50 === null || p50 === undefined || !Number.isFinite(p50)) {
      return { label: 'Sem amostras', tone: 'default', badgeType: 'outline' };
    }
    if (p50 <= FAST_MS) return { label: 'Rápido', tone: 'success', badgeType: 'default' };
    if (p50 <= WATCH_MS) return { label: 'Atenção', tone: 'warning', badgeType: 'secondary' };
    return { label: 'Lento', tone: 'destructive', badgeType: 'destructive' };
  }

  private anprDuration(key: string): AnprDurationSummary | null {
    return this.anprData()?.durations?.[key] ?? null;
  }

  private registrationDuration(key: string): RegistrationDurationSummary | null {
    return this.registration()?.durations?.[key] ?? null;
  }

  private carregarEmpresas(): void {
    this.companyService.list().subscribe({
      next: (empresas) => this.empresas.set(empresas),
      error: (error) => this.logger.error('Falha ao carregar empresas', error),
    });
  }

  private carregarUsoExterno(companyId: string, dateFrom: string, dateTo: string): void {
    this.externalLoading.set(true);
    this.externalSummary.set(null);

    const filters: ExternalInteractionFilters = { page: 1, limit: 1 };
    if (companyId) filters.companyId = companyId;
    if (dateFrom) filters.dateFrom = `${dateFrom}T00:00:00.000Z`;
    if (dateTo) filters.dateTo = `${dateTo}T23:59:59.999Z`;

    this.anprService.externalInteractions(filters).subscribe({
      next: (response) => {
        this.externalSummary.set(response.summary);
        this.externalLoading.set(false);
      },
      error: (error) => {
        this.externalLoading.set(false);
        this.logger.error('Falha ao carregar uso das APIs externas', error);
      },
    });
  }

  private num(record: Record<string, number> | null | undefined, key: string): number | null {
    if (!record) return null;
    const value = record[key];
    return value === undefined || !Number.isFinite(value) ? null : value;
  }

  private entries<T>(record?: Record<string, T> | null): { key: string; value: T }[] {
    return record ? Object.entries(record).map(([key, value]) => ({ key, value })) : [];
  }
}
