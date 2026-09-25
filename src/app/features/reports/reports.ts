import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, firstValueFrom, type Observable } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSegmentedComponent } from '@/shared/components/segmented';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardTableImports } from '@/shared/components/table';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ReportService } from '@/shared/services/report.service';
import { VehicleService } from '@/shared/services/vehicle.service';
import type {
  AdminUnity,
  DwellReportResponse,
  ExceptionsResponse,
  FleetStatusResponse,
  MovementBookResponse,
  ReportFilters,
  TransitReportResponse,
  UtilizationReportResponse,
  Vehicle,
} from '@/shared/models';

type ReportView = 'visao-geral' | 'frota' | 'livro' | 'permanencia' | 'transito' | 'excecoes';
type BadgeType = 'default' | 'secondary' | 'destructive' | 'outline';

const SEVEN_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Relatórios gerenciais de tempo da frota própria: livro de movimentação,
 * permanência, trânsito entre unidades, posição atual da frota, utilização e exceções.
 */
@Component({
  selector: 'app-reports',
  imports: [
    SiteHeader,
    LoadingSpinner,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardSegmentedComponent,
    ZardSelectImports,
    ZardTableImports,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Relatórios de tempo</h1>
          <p class="text-sm text-muted-foreground">
            Permanência e ausência da frota própria, calculadas a partir do livro de movimentação.
          </p>
        </div>

        <button
          z-button
          zType="outline"
          zSize="sm"
          type="button"
          [zLoading]="loadingResumo()"
          (click)="atualizarTudo()"
        >
          <ng-icon name="lucideRefreshCw" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <z-card>
          <div class="flex items-center gap-3 p-4">
            <ng-icon name="lucideBuilding2" aria-hidden="true" class="size-5 text-muted-foreground" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Na unidade</span>
              <span class="text-xl font-semibold">{{ totalNaUnidade() }}</span>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="flex items-center gap-3 p-4">
            <ng-icon name="lucideRoute" aria-hidden="true" class="size-5 text-info" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Em trânsito</span>
              <span class="text-xl font-semibold">{{ totalEmTransito() }}</span>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="flex items-center gap-3 p-4">
            <ng-icon name="lucideTimer" aria-hidden="true" class="size-5 text-muted-foreground" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Permanência no período</span>
              <span class="text-xl font-semibold">{{ formatarDuracao(permanenciaTotal()) }}</span>
            </div>
          </div>
        </z-card>

        <z-card>
          <div class="flex items-center gap-3 p-4">
            <ng-icon name="lucideClock" aria-hidden="true" class="size-5 text-muted-foreground" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Trânsito no período</span>
              <span class="text-xl font-semibold">{{ formatarDuracao(transitoTotal()) }}</span>
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
              <span class="text-xs text-muted-foreground">Exceções</span>
              <span class="text-xl font-semibold">{{ totalExcecoes() }}</span>
            </div>
          </div>
        </z-card>
      </div>

      <z-card>
        <div class="flex flex-wrap items-end gap-3 p-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">De</span>
            <input
              z-input
              type="date"
              class="w-40"
              [value]="dataInicio()"
              (change)="onDataChange('inicio', $event)"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Até</span>
            <input
              z-input
              type="date"
              class="w-40"
              [value]="dataFim()"
              (change)="onDataChange('fim', $event)"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Unidade</span>
            <z-select
              [(zValue)]="filtroUnidade"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todas"
              class="w-56"
            >
              <z-select-item zValue="">Todas</z-select-item>
              @for (unidade of unidades(); track unidade.id) {
                <z-select-item [zValue]="unidade.id">{{ unidade.name }}</z-select-item>
              }
            </z-select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Veículo</span>
            <z-select
              [(zValue)]="filtroVeiculo"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todos"
              class="w-56"
            >
              <z-select-item zValue="">Todos</z-select-item>
              @for (veiculo of veiculos(); track veiculo.id) {
                <z-select-item [zValue]="veiculo.id">
                  {{ veiculo.plate }} — {{ veiculo.code }}
                </z-select-item>
              }
            </z-select>
          </label>

          <button z-button zType="ghost" zSize="sm" type="button" (click)="limparFiltros()">
            <ng-icon name="lucideX" aria-hidden="true" />
            Limpar filtros
          </button>
        </div>
      </z-card>

      <z-segmented
        [zOptions]="viewOptions"
        [zDefaultValue]="view()"
        (zChange)="onViewChange($event)"
        zAriaLabel="Seções do relatório"
      />

      @switch (view()) {
        @case ('visao-geral') {
          <z-card>
            <div class="border-b border-border px-4 py-3">
              <h2 class="text-sm font-medium">Utilização da frota</h2>
              <p class="text-xs text-muted-foreground">
                Distribuição do tempo de cada veículo no período selecionado.
              </p>
            </div>

            @if (loadingResumo()) {
              <div class="flex items-center justify-center py-12">
                <gp-loading-spinner message="Carregando..." />
              </div>
            } @else if (utilizacao(); as util) {
              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Veículo</th>
                      <th z-table-head class="text-right">Permanência</th>
                      <th z-table-head class="text-right">Trânsito</th>
                      <th z-table-head class="text-right">Sem registro</th>
                      <th z-table-head class="w-56">Ocupação</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (linha of util.byVehicle; track linha.vehicle.id) {
                      <tr z-table-row>
                        <td z-table-cell class="font-medium text-foreground">
                          <span class="font-mono">{{ linha.vehicle.plate }}</span>
                          <span class="ml-1 text-xs text-muted-foreground">
                            ({{ linha.vehicle.code }})
                          </span>
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatarDuracao(linha.dwellMinutes) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatarDuracao(linha.transitMinutes) }}
                        </td>
                        <td z-table-cell class="text-right">
                          {{ formatarDuracao(linha.unaccountedMinutes) }}
                        </td>
                        <td z-table-cell>
                          <div class="flex flex-col gap-1">
                            <div
                              class="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              [attr.aria-valuenow]="linha.dwellPct"
                              aria-valuemin="0"
                              aria-valuemax="100"
                              [attr.aria-label]="
                                'Permanência ' +
                                linha.dwellPct +
                                '%, trânsito ' +
                                linha.transitPct +
                                '%'
                              "
                            >
                              <div
                                class="h-full bg-primary"
                                [style.width.%]="linha.dwellPct"
                              ></div>
                              <div
                                class="h-full bg-info"
                                [style.width.%]="linha.transitPct"
                              ></div>
                            </div>
                            <span class="text-xs text-muted-foreground">
                              {{ linha.dwellPct }}% permanência · {{ linha.transitPct }}% trânsito
                            </span>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td z-table-cell colspan="5" class="py-10 text-center text-muted-foreground">
                          Nenhum dado de utilização no período.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </z-card>
        }

        @case ('frota') {
          @if (frota(); as status) {
            <div class="grid gap-4 lg:grid-cols-2">
              @for (grupo of status.atUnits; track grupo.unitId) {
                <z-card>
                  <div class="border-b border-border px-4 py-3">
                    <h2 class="flex items-center gap-2 text-sm font-medium">
                      <ng-icon name="lucideMapPin" aria-hidden="true" class="size-4" />
                      {{ grupo.unitName ?? 'Unidade' }}
                      <z-badge zType="secondary" zShape="pill">
                        {{ grupo.vehicles.length }}
                      </z-badge>
                    </h2>
                  </div>
                  <div class="flex flex-col divide-y divide-border">
                    @for (item of grupo.vehicles; track item.vehicle.id) {
                      <div class="flex items-center justify-between gap-3 px-4 py-3">
                        <div class="flex flex-col">
                          <span class="font-mono text-sm font-medium">
                            {{ item.vehicle.plate }}
                          </span>
                          <span class="text-xs text-muted-foreground">
                            {{ item.vehicle.code }} · desde {{ formatarDataHora(item.since) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          @if (!item.inJourneyWindow) {
                            <z-badge zType="outline" zShape="pill">Fora da jornada</z-badge>
                          }
                          <span class="text-sm text-muted-foreground">
                            {{ formatarDuracao(item.dwellMinutes) }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                </z-card>
              }
            </div>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="flex items-center gap-2 text-sm font-medium">
                  <ng-icon name="lucideRoute" aria-hidden="true" class="size-4" />
                  Em trânsito
                  <z-badge zType="secondary" zShape="pill">{{ status.inTransit.length }}</z-badge>
                </h2>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Veículo</th>
                    <th z-table-head>Saída em</th>
                    <th z-table-head class="text-right">Tempo em trânsito</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (item of status.inTransit; track item.vehicle.id) {
                    <tr z-table-row>
                      <td z-table-cell class="font-mono">{{ item.vehicle.plate }}</td>
                      <td z-table-cell>{{ formatarDataHora(item.since) }}</td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(item.minutes) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="3" class="py-10 text-center text-muted-foreground">
                        Nenhum veículo em trânsito no momento.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>
          }
        }

        @case ('livro') {
          <z-card>
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 class="text-sm font-medium">Livro de movimentação</h2>
                <p class="text-xs text-muted-foreground">
                  Cada movimento com o tempo de permanência ou de trânsito calculado.
                </p>
              </div>

              <button
                z-button
                zType="outline"
                zSize="sm"
                type="button"
                [zLoading]="exportando()"
                (click)="exportarCsv()"
              >
                <ng-icon name="lucideDownload" aria-hidden="true" />
                Exportar CSV
              </button>
            </div>

            @if (loadingView()) {
              <div class="flex items-center justify-center py-12">
                <gp-loading-spinner message="Carregando livro..." />
              </div>
            } @else if (livro(); as book) {
              <div class="overflow-x-auto">
                <table z-table>
                  <thead z-table-header>
                    <tr z-table-row>
                      <th z-table-head>Data/Hora</th>
                      <th z-table-head>Veículo</th>
                      <th z-table-head>Tipo</th>
                      <th z-table-head>Unidade/Ponto</th>
                      <th z-table-head>Motorista</th>
                      <th z-table-head>Motivo</th>
                      <th z-table-head class="text-right">Tempo</th>
                      <th z-table-head>Origem → Destino</th>
                      <th z-table-head>Observação</th>
                    </tr>
                  </thead>
                  <tbody z-table-body>
                    @for (row of book.data; track row.movementId) {
                      <tr z-table-row>
                        <td z-table-cell class="whitespace-nowrap">
                          {{ formatarDataHora(row.dateTime) }}
                        </td>
                        <td z-table-cell class="font-mono whitespace-nowrap">
                          {{ row.vehiclePlate }}
                        </td>
                        <td z-table-cell>
                          <z-badge
                            [zType]="row.type === 'entry' ? 'default' : 'secondary'"
                            zShape="pill"
                          >
                            {{ row.type === 'entry' ? 'Entrada' : 'Saída' }}
                          </z-badge>
                        </td>
                        <td z-table-cell>
                          {{ row.unitName ?? '—' }}
                          @if (row.pointName) {
                            <span class="text-xs text-muted-foreground">· {{ row.pointName }}</span>
                          }
                        </td>
                        <td z-table-cell>{{ row.driverName ?? '—' }}</td>
                        <td z-table-cell>{{ row.purpose ?? '—' }}</td>
                        <td z-table-cell class="text-right whitespace-nowrap">
                          {{ formatarDuracao(row.minutes) }}
                          @if (row.ongoing) {
                            <span class="text-xs text-muted-foreground"> (em curso)</span>
                          }
                        </td>
                        <td z-table-cell class="whitespace-nowrap">
                          @if (row.kind === 'transit') {
                            {{ row.originUnitName ?? '—' }} →
                            {{ row.destinationUnitName ?? '—' }}
                          } @else {
                            <span class="text-muted-foreground">—</span>
                          }
                        </td>
                        <td z-table-cell>
                          @if (row.anomaly) {
                            <z-badge zType="destructive" zShape="pill">
                              {{ anomalyLabel(row.anomaly) }}
                            </z-badge>
                          } @else {
                            <span class="text-muted-foreground">—</span>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr z-table-row>
                        <td z-table-cell colspan="9" class="py-10 text-center text-muted-foreground">
                          Nenhuma movimentação da frota própria no período.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </z-card>
        }

        @case ('permanencia') {
          @if (loadingView()) {
            <div class="flex items-center justify-center py-12">
              <gp-loading-spinner message="Carregando permanência..." />
            </div>
          } @else if (permanencia(); as dwell) {
            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Permanência por unidade</h2>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Unidade</th>
                    <th z-table-head class="text-right">Visitas</th>
                    <th z-table-head class="text-right">Média</th>
                    <th z-table-head class="text-right">Mediana</th>
                    <th z-table-head class="text-right">p95</th>
                    <th z-table-head class="text-right">Mín.</th>
                    <th z-table-head class="text-right">Máx.</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (linha of dwell.byUnit; track linha.unitId) {
                    <tr z-table-row>
                      <td z-table-cell class="font-medium text-foreground">
                        {{ linha.unitName ?? linha.unitId }}
                      </td>
                      <td z-table-cell class="text-right">{{ linha.visits }}</td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(linha.avgMinutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(linha.medianMinutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(linha.p95Minutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(linha.minMinutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(linha.maxMinutes) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                        Nenhuma permanência registrada no período.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>
          }
        }

        @case ('transito') {
          @if (loadingView()) {
            <div class="flex items-center justify-center py-12">
              <gp-loading-spinner message="Carregando trânsito..." />
            </div>
          } @else if (transito(); as transit) {
            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Trânsito por rota</h2>
                <p class="text-xs text-muted-foreground">
                  Tempo entre a saída de uma unidade e a entrada na seguinte.
                </p>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Origem</th>
                    <th z-table-head>Destino</th>
                    <th z-table-head class="text-right">Viagens</th>
                    <th z-table-head class="text-right">Média</th>
                    <th z-table-head class="text-right">p95</th>
                    <th z-table-head class="text-right">Mín.</th>
                    <th z-table-head class="text-right">Máx.</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (rota of transit.routes; track rota.originUnitId + rota.destinationUnitId) {
                    <tr z-table-row>
                      <td z-table-cell>{{ rota.originUnitName ?? '—' }}</td>
                      <td z-table-cell>{{ rota.destinationUnitName ?? '—' }}</td>
                      <td z-table-cell class="text-right">{{ rota.visits }}</td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(rota.avgMinutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(rota.p95Minutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(rota.minMinutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(rota.maxMinutes) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                        Nenhum trânsito entre unidades no período.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>
          }
        }

        @case ('excecoes') {
          @if (loadingResumo()) {
            <div class="flex items-center justify-center py-12">
              <gp-loading-spinner message="Carregando exceções..." />
            </div>
          } @else if (excecoes(); as exc) {
            <div class="flex flex-wrap gap-2">
              <z-badge zType="destructive" zShape="pill">
                {{ exc.summary.openTooLong }} sem saída (&gt; 8h)
              </z-badge>
              <z-badge zType="destructive" zShape="pill">
                {{ exc.summary.missingExit }} sem saída
              </z-badge>
              <z-badge zType="secondary" zShape="pill">
                {{ exc.summary.missingArrival }} sem chegada
              </z-badge>
              <z-badge zType="outline" zShape="pill">
                {{ exc.summary.aboveBaseline }} acima do p95
              </z-badge>
              <z-badge zType="outline" zShape="pill">
                {{ exc.summary.overnight }} pernoite
              </z-badge>
            </div>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Trânsito acima do p95 da rota</h2>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Veículo</th>
                    <th z-table-head>Rota</th>
                    <th z-table-head>Saída em</th>
                    <th z-table-head class="text-right">Tempo</th>
                    <th z-table-head class="text-right">Desvio</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (item of exc.aboveBaseline; track item.departedMovementId) {
                    <tr z-table-row>
                      <td z-table-cell class="font-mono">{{ item.vehicle?.plate ?? '—' }}</td>
                      <td z-table-cell>
                        {{ item.originUnitName ?? '—' }} → {{ item.destinationUnitName ?? '—' }}
                      </td>
                      <td z-table-cell class="whitespace-nowrap">
                        {{ formatarDataHora(item.departedAt) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(item.minutes) }}
                      </td>
                      <td z-table-cell class="text-right">
                        @if (item.deviationPct !== null) {
                          <span [class]="item.deviationPct > 0 ? 'text-destructive' : 'text-success'">
                            {{ item.deviationPct > 0 ? '+' : '' }}{{ item.deviationPct }}%
                          </span>
                        } @else {
                          <span class="text-muted-foreground">—</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="5" class="py-10 text-center text-muted-foreground">
                        Nenhum trânsito acima do p95 no período.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Pernoitantes / fora da jornada</h2>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Veículo</th>
                    <th z-table-head>Rota</th>
                    <th z-table-head>Saída em</th>
                    <th z-table-head class="text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (item of exc.overnight; track item.departedMovementId) {
                    <tr z-table-row>
                      <td z-table-cell class="font-mono">{{ item.vehicle?.plate ?? '—' }}</td>
                      <td z-table-cell>
                        {{ item.originUnitName ?? '—' }} → {{ item.destinationUnitName ?? '—' }}
                      </td>
                      <td z-table-cell class="whitespace-nowrap">
                        {{ formatarDataHora(item.departedAt) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(item.minutes) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="4" class="py-10 text-center text-muted-foreground">
                        Nenhum trânsito fora da jornada no período.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>

            <z-card>
              <div class="border-b border-border px-4 py-3">
                <h2 class="text-sm font-medium">Saída sem entrada de destino</h2>
              </div>
              <table z-table>
                <thead z-table-header>
                  <tr z-table-row>
                    <th z-table-head>Veículo</th>
                    <th z-table-head>Origem</th>
                    <th z-table-head>Saída em</th>
                    <th z-table-head class="text-right">Tempo</th>
                  </tr>
                </thead>
                <tbody z-table-body>
                  @for (item of exc.missingArrival; track item.departedMovementId) {
                    <tr z-table-row>
                      <td z-table-cell class="font-mono">{{ item.vehicle?.plate ?? '—' }}</td>
                      <td z-table-cell>{{ item.originUnitName ?? '—' }}</td>
                      <td z-table-cell class="whitespace-nowrap">
                        {{ formatarDataHora(item.departedAt) }}
                      </td>
                      <td z-table-cell class="text-right">
                        {{ formatarDuracao(item.minutes) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr z-table-row>
                      <td z-table-cell colspan="4" class="py-10 text-center text-muted-foreground">
                        Nenhuma saída sem destino registrada.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </z-card>
          }
        }
      }
    </main>
  `,
})
export class Reports implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly vehicleService = inject(VehicleService);
  private readonly logger = inject(LoggerService).create('Reports');

  protected readonly viewOptions = [
    { value: 'visao-geral', label: 'Visão geral' },
    { value: 'frota', label: 'Frota agora' },
    { value: 'livro', label: 'Livro' },
    { value: 'permanencia', label: 'Permanência' },
    { value: 'transito', label: 'Trânsito' },
    { value: 'excecoes', label: 'Exceções' },
  ];

  protected readonly view = signal<ReportView>('visao-geral');
  protected readonly dataInicio = signal(this.paraInputDate(new Date(Date.now() - SEVEN_DAYS_MS)));
  protected readonly dataFim = signal(this.paraInputDate(new Date()));
  protected readonly filtroUnidade = signal('');
  protected readonly filtroVeiculo = signal('');

  protected readonly unidades = signal<AdminUnity[]>([]);
  protected readonly veiculos = signal<Vehicle[]>([]);

  protected readonly loadingResumo = signal(false);
  protected readonly loadingView = signal(false);
  protected readonly exportando = signal(false);

  protected readonly frota = signal<FleetStatusResponse | null>(null);
  protected readonly utilizacao = signal<UtilizationReportResponse | null>(null);
  protected readonly excecoes = signal<ExceptionsResponse | null>(null);
  protected readonly permanencia = signal<DwellReportResponse | null>(null);
  protected readonly transito = signal<TransitReportResponse | null>(null);
  protected readonly livro = signal<MovementBookResponse | null>(null);

  protected readonly filtros = computed<ReportFilters>(() => {
    const filtros: ReportFilters = {
      dateFrom: `${this.dataInicio()}T00:00:00.000Z`,
      dateTo: `${this.dataFim()}T23:59:59.999Z`,
    };
    const unidade = this.filtroUnidade();
    if (unidade) filtros.adminUnityId = unidade;
    const veiculo = this.filtroVeiculo();
    if (veiculo) filtros.vehicleId = veiculo;
    return filtros;
  });

  protected readonly totalNaUnidade = computed(
    () => this.frota()?.atUnits.reduce((total, grupo) => total + grupo.vehicles.length, 0) ?? 0,
  );
  protected readonly totalEmTransito = computed(() => this.frota()?.inTransit.length ?? 0);
  protected readonly permanenciaTotal = computed(
    () => this.utilizacao()?.totals.dwellMinutes ?? 0,
  );
  protected readonly transitoTotal = computed(
    () => this.utilizacao()?.totals.transitMinutes ?? 0,
  );
  protected readonly totalExcecoes = computed(() => {
    const resumo = this.excecoes()?.summary;
    if (!resumo) return 0;
    return (
      resumo.openTooLong +
      resumo.missingExit +
      resumo.missingArrival +
      resumo.aboveBaseline +
      resumo.overnight
    );
  });

  ngOnInit(): void {
    void this.carregarFiltros();
    this.carregarResumo();
    this.carregarView();
  }

  protected onDataChange(campo: 'inicio' | 'fim', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    if (campo === 'inicio') this.dataInicio.set(valor);
    else this.dataFim.set(valor);
    this.recarregar();
  }

  protected onFiltroChange(): void {
    this.recarregar();
  }

  protected onViewChange(value: string): void {
    this.view.set(value as ReportView);
    this.carregarView();
  }

  protected limparFiltros(): void {
    this.dataInicio.set(this.paraInputDate(new Date(Date.now() - SEVEN_DAYS_MS)));
    this.dataFim.set(this.paraInputDate(new Date()));
    this.filtroUnidade.set('');
    this.filtroVeiculo.set('');
    this.recarregar();
  }

  protected atualizarTudo(): void {
    this.recarregar();
  }

  protected async exportarCsv(): Promise<void> {
    this.exportando.set(true);
    try {
      const csv = await firstValueFrom(this.reportService.downloadMovementBookCsv(this.filtros()));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'livro-movimentacao.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.logger.error('Falha ao exportar o livro de movimentação', error);
      toast.error('Falha ao exportar o livro de movimentação.');
    } finally {
      this.exportando.set(false);
    }
  }

  protected formatarDataHora(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatarDuracao(minutos: number | null): string {
    if (minutos === null || minutos === undefined) return '—';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas < 24) return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
    const dias = Math.floor(horas / 24);
    return `${dias}d ${horas % 24}h`;
  }

  protected anomalyLabel(anomaly: string): string {
    switch (anomaly) {
      case 'missing_exit':
        return 'Sem saída';
      case 'missing_arrival':
        return 'Sem chegada';
      case 'open_too_long':
        return 'Aberta há muito tempo';
      case 'above_p95':
        return 'Acima do p95';
      case 'overnight':
        return 'Pernoite';
      default:
        return anomaly;
    }
  }

  private recarregar(): void {
    this.carregarResumo();
    this.carregarView();
  }

  private carregarResumo(): void {
    this.loadingResumo.set(true);
    forkJoin({
      frota: this.reportService.fleetStatus(),
      utilizacao: this.reportService.utilization(this.filtros()),
      excecoes: this.reportService.exceptions(this.filtros()),
    }).subscribe({
      next: ({ frota, utilizacao, excecoes }) => {
        this.frota.set(frota);
        this.utilizacao.set(utilizacao);
        this.excecoes.set(excecoes);
        this.loadingResumo.set(false);
      },
      error: (error) => {
        this.loadingResumo.set(false);
        this.logger.error('Falha ao carregar o resumo dos relatórios', error);
        toast.error('Falha ao carregar o resumo dos relatórios.');
      },
    });
  }

  private carregarView(): void {
    switch (this.view()) {
      case 'livro':
        this.carregar(this.reportService.movementBook(this.filtros()), (value) =>
          this.livro.set(value),
        );
        break;
      case 'permanencia':
        this.carregar(this.reportService.dwell(this.filtros()), (value) =>
          this.permanencia.set(value),
        );
        break;
      case 'transito':
        this.carregar(this.reportService.transit(this.filtros()), (value) =>
          this.transito.set(value),
        );
        break;
      default:
        break;
    }
  }

  private carregar<T>(origem: Observable<T>, aplicar: (value: T) => void): void {
    this.loadingView.set(true);
    origem.subscribe({
      next: (value) => {
        aplicar(value);
        this.loadingView.set(false);
      },
      error: (error) => {
        this.loadingView.set(false);
        this.logger.error('Falha ao carregar o relatório', error);
        toast.error('Falha ao carregar o relatório.');
      },
    });
  }

  private async carregarFiltros(): Promise<void> {
    try {
      const [unidades, veiculos] = await Promise.all([
        firstValueFrom(this.adminUnityService.list()),
        firstValueFrom(this.vehicleService.list()),
      ]);
      this.unidades.set(unidades);
      this.veiculos.set(veiculos.filter((veiculo) => veiculo.type === 'own'));
    } catch (error) {
      this.logger.error('Falha ao carregar unidades e veículos', error);
    }
  }

  private paraInputDate(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
