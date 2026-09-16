import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardTableImports } from '@/shared/components/table';
import { AnprService } from '@/shared/services/anpr.service';
import { CompanyService } from '@/shared/services/company.service';
import { LoggerService } from '@/shared/services/logger.service';
import type {
  Company,
  CompanyUsage,
  ExternalFinalSource,
  ExternalInteraction,
  ExternalInteractionFilters,
  ExternalInteractionOutcome,
  ExternalInteractionSummary,
  ExternalRecognitionMode,
} from '@/shared/models';

type BadgeType = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * Uso consolidado das APIs externas de reconhecimento em todas as empresas.
 * Tela restrita ao administrador global (`companyId = null`).
 */
@Component({
  selector: 'app-external-usage',
  imports: [
    SiteHeader,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    ZardPaginationComponent,
    ZardSelectImports,
    ZardTableImports,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Uso de APIs externas</h1>
          <p class="text-sm text-muted-foreground">
            Chamadas às APIs externas de reconhecimento em todas as empresas, com latência e custo
            estimado.
          </p>
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

      @if (resumo(); as r) {
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon
                name="lucideActivity"
                aria-hidden="true"
                class="size-5 text-muted-foreground"
              />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Chamadas</span>
                <span class="text-xl font-semibold">{{ r.calls }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideCheckCircle" aria-hidden="true" class="size-5 text-success" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Sucessos</span>
                <span class="text-xl font-semibold">{{ r.success }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideCircleAlert" aria-hidden="true" class="size-5 text-warning" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Sem placa</span>
                <span class="text-xl font-semibold">{{ r.noPlate }}</span>
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
                <span class="text-xs text-muted-foreground">Falhas</span>
                <span class="text-xl font-semibold">{{ r.failures }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideTimer" aria-hidden="true" class="size-5 text-muted-foreground" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Latência média</span>
                <span class="text-xl font-semibold">{{ formatarLatencia(r.avgLatencyMs) }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideGauge" aria-hidden="true" class="size-5 text-muted-foreground" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Latência p95</span>
                <span class="text-xl font-semibold">{{ formatarLatencia(r.p95LatencyMs) }}</span>
              </div>
            </div>
          </z-card>

          <z-card>
            <div class="flex items-center gap-3 p-4">
              <ng-icon name="lucideCoins" aria-hidden="true" class="size-5 text-muted-foreground" />
              <div class="flex flex-col">
                <span class="text-xs text-muted-foreground">Custo total</span>
                <span class="text-xl font-semibold">{{
                  formatarCusto(r.totalCost, r.costCurrency)
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
                <span class="text-xs text-muted-foreground">Placa final externa</span>
                <span class="text-xl font-semibold">{{ r.externalUsed }}</span>
              </div>
            </div>
          </z-card>
        </div>
      }

      <z-card>
        <div class="flex flex-wrap items-end gap-3 p-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Provider</span>
            <input
              z-input
              class="w-48"
              placeholder="Ex.: google_vision"
              [value]="filtroProvider()"
              (input)="onProviderInput($event)"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Empresa</span>
            <z-select
              [(zValue)]="filtroCompanyId"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todas"
              class="w-56"
            >
              <z-select-item zValue="">Todas</z-select-item>
              @for (empresa of empresas(); track empresa.id) {
                <z-select-item [zValue]="empresa.id">{{ empresa.name }}</z-select-item>
              }
            </z-select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Modo</span>
            <z-select
              [(zValue)]="filtroMode"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todos"
              class="w-40"
            >
              <z-select-item zValue="">Todos</z-select-item>
              <z-select-item zValue="local">Local</z-select-item>
              <z-select-item zValue="verified">Verificado</z-select-item>
              <z-select-item zValue="external">Externo</z-select-item>
            </z-select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Resultado</span>
            <z-select
              [(zValue)]="filtroOutcome"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todos"
              class="w-44"
            >
              <z-select-item zValue="">Todos</z-select-item>
              <z-select-item zValue="success">Sucesso</z-select-item>
              <z-select-item zValue="no_plate">Sem placa</z-select-item>
              <z-select-item zValue="low_confidence">Baixa confiança</z-select-item>
              <z-select-item zValue="timeout">Timeout</z-select-item>
              <z-select-item zValue="error">Erro</z-select-item>
              <z-select-item zValue="rate_limited">Rate limit</z-select-item>
            </z-select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Origem final</span>
            <z-select
              [(zValue)]="filtroFinalSource"
              (zSelectionChange)="onFiltroChange()"
              zPlaceholder="Todas"
              class="w-44"
            >
              <z-select-item zValue="">Todas</z-select-item>
              <z-select-item zValue="external">Externa</z-select-item>
              <z-select-item zValue="local">Local</z-select-item>
              <z-select-item zValue="local_fallback">Fallback local</z-select-item>
              <z-select-item zValue="none">Nenhuma</z-select-item>
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
        </div>
      </z-card>

      <z-card>
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Interações</h2>
        </div>

        <div class="overflow-x-auto">
          <table z-table>
            <thead z-table-header>
              <tr z-table-row>
                <th z-table-head>Data/Hora</th>
                <th z-table-head>Empresa</th>
                <th z-table-head>Provider</th>
                <th z-table-head>Modo</th>
                <th z-table-head>Placa local</th>
                <th z-table-head>Placa externa</th>
                <th z-table-head>Placa final</th>
                <th z-table-head>Origem</th>
                <th z-table-head>Resultado</th>
                <th z-table-head>HTTP</th>
                <th z-table-head class="text-right">Latência</th>
                <th z-table-head class="text-right">Unid.</th>
                <th z-table-head class="text-right">Custo</th>
              </tr>
            </thead>
            <tbody z-table-body>
              @if (loading()) {
                <tr z-table-row>
                  <td z-table-cell colspan="13" class="py-10 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              } @else {
                @for (item of interacoes(); track item.id) {
                  <tr z-table-row>
                    <td z-table-cell class="whitespace-nowrap">
                      {{ formatarData(item.startedAt) }}
                    </td>
                    <td z-table-cell class="whitespace-nowrap">
                      {{ nomeEmpresa(item.companyId) }}
                    </td>
                    <td z-table-cell>{{ item.provider }}</td>
                    <td z-table-cell>{{ modoLabel(item.mode) }}</td>
                    <td z-table-cell class="font-mono">{{ item.localPlate ?? '—' }}</td>
                    <td z-table-cell class="font-mono">{{ item.externalPlate ?? '—' }}</td>
                    <td z-table-cell class="font-mono font-medium">{{ item.finalPlate ?? '—' }}</td>
                    <td z-table-cell>
                      <z-badge [zType]="origemBadgeType(item.finalSource)" zShape="pill">
                        {{ origemLabel(item.finalSource) }}
                      </z-badge>
                    </td>
                    <td z-table-cell>
                      <z-badge [zType]="resultadoBadgeType(item.outcome)" zShape="pill">
                        {{ resultadoLabel(item.outcome) }}
                      </z-badge>
                    </td>
                    <td z-table-cell>{{ item.httpStatus ?? '—' }}</td>
                    <td z-table-cell class="text-right">{{ formatarLatencia(item.latencyMs) }}</td>
                    <td z-table-cell class="text-right">{{ item.billableUnits }}</td>
                    <td z-table-cell class="text-right">
                      {{ formatarCusto(item.costAmount, item.costCurrency) }}
                    </td>
                  </tr>
                } @empty {
                  <tr z-table-row>
                    <td z-table-cell colspan="13" class="py-10 text-center text-muted-foreground">
                      Nenhuma interação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        @if (totalRegistros() > 0) {
          <div class="px-4 pb-4">
            <z-pagination
              [totalItems]="totalRegistros()"
              [pageSize]="limit()"
              [currentPage]="paginaAtual()"
              (pageChange)="onPageChange($event)"
            />
          </div>
        }
      </z-card>

      <z-card>
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-medium">Uso por empresa</h2>
        </div>

        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Empresa</th>
              <th z-table-head class="text-right">Chamadas</th>
              <th z-table-head class="text-right">Sucessos</th>
              <th z-table-head class="text-right">Sem placa</th>
              <th z-table-head class="text-right">Falhas</th>
              <th z-table-head class="text-right">Latência média</th>
              <th z-table-head class="text-right">Custo</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @for (empresa of porEmpresa(); track empresa.companyId) {
              <tr z-table-row>
                <td z-table-cell class="font-medium text-foreground">
                  {{ empresa.companyName ?? empresa.companyId }}
                </td>
                <td z-table-cell class="text-right">{{ empresa.calls }}</td>
                <td z-table-cell class="text-right">{{ empresa.success }}</td>
                <td z-table-cell class="text-right">{{ empresa.noPlate }}</td>
                <td z-table-cell class="text-right">{{ empresa.failures }}</td>
                <td z-table-cell class="text-right">
                  {{ formatarLatencia(empresa.avgLatencyMs) }}
                </td>
                <td z-table-cell class="text-right">
                  {{ formatarCusto(empresa.totalCost, moedaAtual()) }}
                </td>
              </tr>
            } @empty {
              <tr z-table-row>
                <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                  Nenhum uso registrado no período.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </z-card>
    </main>
  `,
})
export class ExternalUsage implements OnInit, OnDestroy {
  private readonly anprService = inject(AnprService);
  private readonly companyService = inject(CompanyService);
  private readonly logger = inject(LoggerService).create('ExternalUsage');

  protected readonly interacoes = signal<ExternalInteraction[]>([]);
  protected readonly porEmpresa = signal<CompanyUsage[]>([]);
  protected readonly empresas = signal<Company[]>([]);
  protected readonly resumo = signal<ExternalInteractionSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly totalRegistros = signal(0);
  protected readonly paginaAtual = signal(1);
  protected readonly limit = signal(20);

  protected readonly filtroProvider = signal('');
  protected readonly filtroCompanyId = signal('');
  protected readonly filtroMode = signal('');
  protected readonly filtroOutcome = signal('');
  protected readonly filtroFinalSource = signal('');
  protected readonly filtroDateFrom = signal('');
  protected readonly filtroDateTo = signal('');

  private readonly nomesPorEmpresa = new Map<string, string>();
  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.carregarEmpresas();
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId !== null) {
      clearTimeout(this.searchDebounceId);
    }
  }

  protected moedaAtual(): string {
    return this.resumo()?.costCurrency ?? 'USD';
  }

  protected nomeEmpresa(companyId: string): string {
    return this.nomesPorEmpresa.get(companyId) ?? companyId;
  }

  protected onProviderInput(event: Event): void {
    this.filtroProvider.set((event.target as HTMLInputElement).value);
    if (this.searchDebounceId !== null) {
      clearTimeout(this.searchDebounceId);
    }
    this.searchDebounceId = setTimeout(() => {
      this.paginaAtual.set(1);
      this.carregar();
    }, 400);
  }

  protected onDateChange(campo: 'from' | 'to', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    if (campo === 'from') {
      this.filtroDateFrom.set(valor);
    } else {
      this.filtroDateTo.set(valor);
    }
    this.paginaAtual.set(1);
    this.carregar();
  }

  protected onFiltroChange(): void {
    this.paginaAtual.set(1);
    this.carregar();
  }

  protected limparFiltros(): void {
    this.filtroProvider.set('');
    this.filtroCompanyId.set('');
    this.filtroMode.set('');
    this.filtroOutcome.set('');
    this.filtroFinalSource.set('');
    this.filtroDateFrom.set('');
    this.filtroDateTo.set('');
    this.paginaAtual.set(1);
    this.carregar();
  }

  protected onPageChange(page: number): void {
    this.paginaAtual.set(page);
    this.carregar();
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  protected formatarLatencia(ms: number | null): string {
    if (ms === null || ms === undefined) return '—';
    return `${Math.round(ms)} ms`;
  }

  protected formatarCusto(valor: number | null, moeda: string | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: moeda ?? 'USD',
      }).format(valor);
    } catch {
      return `${valor} ${moeda ?? ''}`.trim();
    }
  }

  protected modoLabel(mode: ExternalRecognitionMode): string {
    switch (mode) {
      case 'local':
        return 'Local';
      case 'verified':
        return 'Verificado';
      case 'external':
        return 'Externo';
      default:
        return mode;
    }
  }

  protected resultadoLabel(outcome: ExternalInteractionOutcome): string {
    switch (outcome) {
      case 'success':
        return 'Sucesso';
      case 'no_plate':
        return 'Sem placa';
      case 'low_confidence':
        return 'Baixa confiança';
      case 'timeout':
        return 'Timeout';
      case 'error':
        return 'Erro';
      case 'rate_limited':
        return 'Rate limit';
      default:
        return outcome;
    }
  }

  protected resultadoBadgeType(outcome: ExternalInteractionOutcome): BadgeType {
    switch (outcome) {
      case 'success':
        return 'default';
      case 'no_plate':
      case 'low_confidence':
        return 'secondary';
      case 'timeout':
      case 'error':
      case 'rate_limited':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  protected origemLabel(source: ExternalFinalSource | null): string {
    switch (source) {
      case 'external':
        return 'Externa';
      case 'local':
        return 'Local';
      case 'local_fallback':
        return 'Fallback local';
      case 'none':
        return 'Nenhuma';
      default:
        return '—';
    }
  }

  protected origemBadgeType(source: ExternalFinalSource | null): BadgeType {
    return source === 'external' ? 'default' : 'outline';
  }

  private carregarEmpresas(): void {
    this.companyService.list().subscribe({
      next: (empresas) => {
        this.empresas.set(empresas);
        for (const empresa of empresas) {
          this.nomesPorEmpresa.set(empresa.id, empresa.name);
        }
      },
      error: (error) => this.logger.error('Falha ao carregar empresas', error),
    });
  }

  protected carregar(): void {
    this.loading.set(true);

    const filtroCompanyId = this.filtroCompanyId();
    const filtroMode = this.filtroMode();
    const filtroOutcome = this.filtroOutcome();
    const filtroFinalSource = this.filtroFinalSource();
    const filtroProvider = this.filtroProvider();
    const filtroDateFrom = this.filtroDateFrom();
    const filtroDateTo = this.filtroDateTo();

    const filters: ExternalInteractionFilters = {
      page: this.paginaAtual(),
      limit: this.limit(),
    };
    if (filtroProvider) filters.provider = filtroProvider;
    if (filtroCompanyId) filters.companyId = filtroCompanyId;
    if (filtroMode) filters.mode = filtroMode as ExternalRecognitionMode;
    if (filtroOutcome) filters.outcome = filtroOutcome as ExternalInteractionOutcome;
    if (filtroFinalSource) filters.finalSource = filtroFinalSource as ExternalFinalSource;
    if (filtroDateFrom) filters.dateFrom = `${filtroDateFrom}T00:00:00.000Z`;
    if (filtroDateTo) filters.dateTo = `${filtroDateTo}T23:59:59.999Z`;

    this.anprService.externalUsage(filters).subscribe({
      next: (res) => {
        this.interacoes.set(res.data);
        this.porEmpresa.set(res.byCompany);
        this.resumo.set(res.summary);
        this.totalRegistros.set(res.meta.total);
        this.paginaAtual.set(res.meta.page);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.logger.error('Falha ao carregar uso das APIs externas', error);
        toast.error('Falha ao carregar uso das APIs externas.');
      },
    });
  }
}
