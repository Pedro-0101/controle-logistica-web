import { Component, OnDestroy, OnInit, inject, signal, ViewContainerRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardTableImports } from '@/shared/components/table';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { ZardDialogService } from '@/shared/components/dialog';
import { MovementService } from '@/shared/services/movement.service';
import type { MovementListItem, MovementFilters } from '@/shared/models';
import { MovementEditDialog } from '@/features/movements/movement-edit-dialog';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    SiteHeader,
    NgIcon,
    ZardButtonComponent,
    ZardCardComponent,
    ZardTableImports,
    ZardBadgeComponent,
    ZardSelectImports,
    ZardInputDirective,
    ZardPaginationComponent,
  ],
  template: `
    <app-site-header />
    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Dashboard</h1>
        <p class="text-sm text-muted-foreground">Visão geral das movimentações e operações.</p>
      </div>

      @if (pendentes() > 0) {
        <a
          routerLink="/movimentos/pendentes"
          class="flex items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning transition-colors hover:bg-warning/20"
        >
          <ng-icon name="lucideTriangleAlert" aria-hidden="true" class="size-4 shrink-0" />
          <span>
            {{ pendentes() }}
            {{
              pendentes() === 1
                ? 'movimentação aguardando revisão'
                : 'movimentações aguardando revisão'
            }}
            — leituras de placa não reconhecidas.
          </span>
          <span class="ml-auto font-medium underline underline-offset-4">Revisar agora</span>
        </a>
      }

      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium">Movimentações</h2>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Atualizar a cada</span>
            <z-select [(zValue)]="refreshInterval" zPlaceholder="Intervalo">
              <z-select-item zValue="0">Desligado</z-select-item>
              <z-select-item zValue="5">5s</z-select-item>
              <z-select-item zValue="10">10s</z-select-item>
              <z-select-item zValue="30">30s</z-select-item>
              <z-select-item zValue="60">60s</z-select-item>
            </z-select>
          </div>

          <button z-button zType="outline" zSize="sm" [zLoading]="loading()" (click)="carregar()">
            <ng-icon name="lucideRefreshCw" />
            Atualizar
          </button>
        </div>
      </div>

      <z-card>
        <div class="flex flex-col gap-4 p-4">
          <div class="flex flex-wrap items-center gap-3">
            <input
              z-input
              class="max-w-xs"
              placeholder="Buscar por placa, motorista, motivo..."
              [value]="searchTerm()"
              (input)="onSearchInput($event)"
            />

            <z-select [(zValue)]="filterType" zPlaceholder="Tipo" class="w-40">
              <z-select-item zValue="">Todos</z-select-item>
              <z-select-item zValue="entry">Entrada</z-select-item>
              <z-select-item zValue="exit">Saída</z-select-item>
            </z-select>

            <z-select [(zValue)]="filterStatus" zPlaceholder="Status" class="w-40">
              <z-select-item zValue="">Todos</z-select-item>
              <z-select-item zValue="open">Aberto</z-select-item>
              <z-select-item zValue="closed">Fechado</z-select-item>
              <z-select-item zValue="pending_review">Pendente</z-select-item>
            </z-select>

            <z-select [(zValue)]="filterAuto" zPlaceholder="Origem" class="w-40">
              <z-select-item zValue="">Todas</z-select-item>
              <z-select-item zValue="true">Automático</z-select-item>
              <z-select-item zValue="false">Manual</z-select-item>
            </z-select>
          </div>
        </div>

        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Data/Hora</th>
              <th z-table-head>Tipo</th>
              <th z-table-head>Status</th>
              <th z-table-head>Placa</th>
              <th z-table-head>Veículo</th>
              <th z-table-head>Ponto</th>
              <th z-table-head>Câmera</th>
              <th z-table-head>Motorista</th>
              <th z-table-head>Motivo</th>
              <th z-table-head>Origem</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @for (m of movimentos(); track m.id) {
              <tr z-table-row>
                <td z-table-cell>{{ formatarData(m.dateTime) }}</td>
                <td z-table-cell>
                  <z-badge [zType]="m.type === 'entry' ? 'default' : 'secondary'" zShape="pill">
                    {{ m.type === 'entry' ? 'Entrada' : 'Saída' }}
                  </z-badge>
                </td>
                <td z-table-cell>
                  <z-badge [zType]="statusBadgeType(m.status)" zShape="pill">
                    {{ statusLabel(m.status) }}
                  </z-badge>
                </td>
                <td z-table-cell class="font-mono">
                  {{ m.vehicle?.plate ?? m.recognizedPlate ?? '—' }}
                </td>
                <td z-table-cell>
                  @if (m.vehicle) {
                    <span>{{ m.vehicle.code }}</span>
                    <span class="text-xs text-muted-foreground ml-1">
                      ({{ vehicleTypeLabel(m.vehicle.type) }})
                    </span>
                  } @else {
                    <span class="text-muted-foreground">—</span>
                  }
                </td>
                <td z-table-cell>{{ m.point?.name ?? '—' }}</td>
                <td z-table-cell>{{ m.camera?.name ?? '—' }}</td>
                <td z-table-cell>{{ m.driverName ?? '—' }}</td>
                <td z-table-cell>{{ m.purpose ?? '—' }}</td>
                <td z-table-cell>
                  @if (m.autoRegistered) {
                    <z-badge zType="outline" zShape="pill">Auto</z-badge>
                  } @else {
                    <span class="text-muted-foreground">Manual</span>
                  }
                </td>
                <td z-table-cell class="text-right">
                  @if (m.status === 'pending_review') {
                    <a
                      z-button
                      zType="ghost"
                      zSize="icon"
                      routerLink="/movimentos/pendentes"
                      [attr.aria-label]="
                        'Revisar movimentação da placa ' +
                        (m.vehicle?.plate ?? m.recognizedPlate ?? 'desconhecida')
                      "
                    >
                      <ng-icon name="lucideSearch" aria-hidden="true" />
                    </a>
                  } @else {
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirEditar(m)"
                      [attr.aria-label]="
                        'Editar movimentação da placa ' +
                        (m.vehicle?.plate ?? m.recognizedPlate ?? 'desconhecida')
                      "
                    >
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr z-table-row>
                <td z-table-cell colspan="11" class="py-10 text-center text-muted-foreground">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            }
          </tbody>
        </table>

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
    </main>
  `,
})
export class Home implements OnInit, OnDestroy {
  private readonly movementService = inject(MovementService);
  private readonly dialog = inject(ZardDialogService);
  private readonly vcr = inject(ViewContainerRef);

  readonly movimentos = signal<MovementListItem[]>([]);
  readonly loading = signal(false);
  readonly pendentes = signal(0);
  readonly refreshInterval = signal<string>('0');
  readonly paginaAtual = signal(1);
  readonly limit = signal(20);
  readonly totalRegistros = signal(0);
  readonly searchTerm = signal('');

  readonly filterType = signal<string>('');
  readonly filterStatus = signal<string>('');
  readonly filterAuto = signal<string>('');

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    this.limparIntervalo();
    if (this.searchDebounceId !== null) {
      clearTimeout(this.searchDebounceId);
    }
  }

  carregar(): void {
    this.loading.set(true);

    const filters: MovementFilters = {
      page: this.paginaAtual(),
      limit: this.limit(),
      orderBy: 'dateTime',
      order: 'DESC',
    };

    const tipo = this.filterType();
    if (tipo) filters.type = tipo as MovementFilters['type'];

    const status = this.filterStatus();
    if (status) filters.status = status as MovementFilters['status'];

    const auto = this.filterAuto();
    if (auto !== '') filters.autoRegistered = auto === 'true';

    const busca = this.searchTerm();
    if (busca) filters.search = busca;

    this.movementService.list(filters).subscribe({
      next: (res) => {
        this.movimentos.set(res.data);
        this.totalRegistros.set(res.meta.total);
        this.paginaAtual.set(res.meta.page);
        this.loading.set(false);
        this.configurarIntervalo();
      },
      error: () => {
        this.loading.set(false);
      },
    });

    this.movementService.pendingReview().subscribe({
      next: (pendentes) => this.pendentes.set(pendentes.length),
    });
  }

  abrirEditar(movimento: MovementListItem): void {
    const ref = this.dialog.create<MovementEditDialog, MovementListItem>({
      zContent: MovementEditDialog,
      zData: movimento,
      zViewContainerRef: this.vcr,
      zTitle: 'Editar movimentação',
      zDescription:
        'Corrija os dados operacionais da movimentação. Apenas os campos alterados são salvos.',
      zHideFooter: true,
      zWidth: '28rem',
      zMaskClosable: false,
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        this.carregar();
      }
    });
  }

  onSearchInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.searchTerm.set(valor);

    if (this.searchDebounceId !== null) {
      clearTimeout(this.searchDebounceId);
    }
    this.searchDebounceId = setTimeout(() => {
      this.paginaAtual.set(1);
      this.carregar();
    }, 400);
  }

  onPageChange(page: number): void {
    this.paginaAtual.set(page);
    this.carregar();
  }

  private configurarIntervalo(): void {
    this.limparIntervalo();
    const segundos = Number(this.refreshInterval());
    if (segundos > 0) {
      this.intervalId = setInterval(() => this.carregar(), segundos * 1000);
    }
  }

  private limparIntervalo(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  statusBadgeType(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'open':
        return 'default';
      case 'closed':
        return 'secondary';
      case 'pending_review':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'closed':
        return 'Fechado';
      case 'pending_review':
        return 'Pendente';
      default:
        return status;
    }
  }

  vehicleTypeLabel(type: string): string {
    switch (type) {
      case 'own':
        return 'Próprio';
      case 'thirdParty':
        return 'Terceiro';
      case 'visitor':
        return 'Visitante';
      default:
        return type;
    }
  }
}
