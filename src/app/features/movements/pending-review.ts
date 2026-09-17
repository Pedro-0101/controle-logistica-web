import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { NgIcon } from '@ng-icons/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { EmptyState } from '@/shared/components/empty-state/empty-state';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { ZardAlertDialogService } from '@/shared/components/alert-dialog';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDialogService } from '@/shared/components/dialog';
import type { PendingReviewMovement } from '@/shared/models';
import { MovementService } from '@/shared/services/movement.service';
import { PointService } from '@/shared/services/point.service';
import { LoggerService } from '@/shared/services/logger.service';
import { toast } from 'ngx-sonner';

import { PendingReviewDialog } from './pending-review-dialog';

/**
 * Tela de revisão de movimentos `pending_review`: movimentos criados
 * automaticamente pelo ANPR cuja placa não foi reconhecida na base.
 * O operador corrige a placa ou cadastra o veículo para confirmar o movimento,
 * ou descarta a leitura incorreta individualmente ou em lote.
 */
@Component({
  selector: 'app-pending-review',
  imports: [
    RouterLink,
    SiteHeader,
    EmptyState,
    LoadingSpinner,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardCheckboxComponent,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Revisão de movimentações</h1>
          <p class="text-sm text-muted-foreground">
            Movimentações automáticas com placa não reconhecida. Confirme a placa ou cadastre o
            veículo.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <a z-button zType="ghost" zSize="sm" routerLink="/">
            <ng-icon name="lucideArrowLeft" aria-hidden="true" />
            Voltar
          </a>

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

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <gp-loading-spinner message="Carregando movimentações pendentes..." />
        </div>
      } @else if (movimentos().length === 0) {
        <gp-empty-state
          icon="lucideCheckCircle"
          title="Nenhuma movimentação pendente"
          description="Todas as leituras de placas foram processadas com sucesso."
        />
      } @else {
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-3"
        >
          <label class="flex cursor-pointer select-none items-center gap-2 text-sm">
            <z-checkbox
              [checked]="todosSelecionados()"
              [zDisabled]="descartando()"
              (checkedChange)="toggleTodos($event)"
            />
            Selecionar todos
          </label>

          <div class="flex items-center gap-3">
            <p class="text-sm text-muted-foreground" role="status">
              @if (selecionadosCount() > 0) {
                {{ selecionadosCount() }}
                {{ selecionadosCount() === 1 ? 'selecionada' : 'selecionadas' }}
                de
              }
              {{ movimentos().length }}
              {{
                movimentos().length === 1
                  ? 'movimentação aguardando revisão'
                  : 'movimentações aguardando revisão'
              }}
            </p>

            @if (selecionadosCount() > 0) {
              <button
                z-button
                zType="destructive"
                zSize="sm"
                type="button"
                [zLoading]="descartando()"
                (click)="descartarSelecionados()"
              >
                <ng-icon name="lucideTrash2" aria-hidden="true" />
                Descartar selecionadas
              </button>
            }
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          @for (m of movimentos(); track m.id) {
            <z-card>
              <div class="flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <label class="flex cursor-pointer items-center">
                      <z-checkbox
                        [checked]="isSelecionado(m.id)"
                        [zDisabled]="descartando()"
                        (checkedChange)="toggleSelecao(m.id)"
                      />
                      <span class="sr-only">
                        Selecionar movimentação da placa
                        {{ m.recognizedPlate ?? 'desconhecida' }}
                      </span>
                    </label>
                    <z-badge [zType]="m.type === 'entry' ? 'default' : 'secondary'" zShape="pill">
                      {{ m.type === 'entry' ? 'Entrada' : 'Saída' }}
                    </z-badge>
                  </div>
                  <time class="text-xs text-muted-foreground" [attr.datetime]="m.dateTime">
                    {{ formatarData(m.dateTime) }}
                  </time>
                </div>

                <div class="flex flex-col gap-1">
                  <span class="text-xs text-muted-foreground">Placa lida pela câmera</span>
                  <span class="font-mono text-xl font-semibold tracking-wider text-foreground">
                    {{ m.recognizedPlate ?? '—' }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <ng-icon name="lucideMapPin" aria-hidden="true" class="size-4" />
                  {{ pontoNome(m.pointId) }}
                </div>

                <div class="flex justify-end gap-2 pt-1">
                  <button
                    z-button
                    zType="outline"
                    zSize="sm"
                    type="button"
                    [zDisabled]="descartando()"
                    (click)="descartar(m)"
                    [attr.aria-label]="
                      'Descartar movimentação da placa ' + (m.recognizedPlate ?? 'desconhecida')
                    "
                  >
                    <ng-icon name="lucideTrash2" aria-hidden="true" />
                    Descartar
                  </button>

                  <button
                    z-button
                    zType="default"
                    zSize="sm"
                    type="button"
                    (click)="abrirRevisao(m)"
                    [attr.aria-label]="
                      'Revisar movimentação da placa ' + (m.recognizedPlate ?? 'desconhecida')
                    "
                  >
                    <ng-icon name="lucidePencil" aria-hidden="true" />
                    Revisar
                  </button>
                </div>
              </div>
            </z-card>
          }
        </div>
      }
    </main>
  `,
})
export class PendingReview implements OnInit {
  private readonly movementService = inject(MovementService);
  private readonly pointService = inject(PointService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('PendingReview');

  protected readonly movimentos = signal<PendingReviewMovement[]>([]);
  protected readonly pontos = signal<Record<string, string>>({});
  protected readonly loading = signal(false);
  protected readonly descartando = signal(false);
  protected readonly selecionados = signal<Set<string>>(new Set());

  protected readonly selecionadosCount = computed(() => this.selecionados().size);
  protected readonly todosSelecionados = computed(() => {
    const movimentos = this.movimentos();
    return movimentos.length > 0 && movimentos.every((m) => this.selecionados().has(m.id));
  });

  ngOnInit(): void {
    void this.carregar();
  }

  protected pontoNome(pointId: string | null): string {
    if (!pointId) return 'Ponto não identificado';
    return this.pontos()[pointId] ?? 'Ponto não identificado';
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected isSelecionado(id: string): boolean {
    return this.selecionados().has(id);
  }

  protected toggleSelecao(id: string): void {
    this.selecionados.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected toggleTodos(selecionar: boolean): void {
    this.selecionados.set(
      selecionar ? new Set(this.movimentos().map((m) => m.id)) : new Set(),
    );
  }

  protected descartar(movimento: PendingReviewMovement): void {
    void this.confirmarDescarte(
      [movimento.id],
      'Descartar movimentação',
      `Descartar a leitura da placa ${
        movimento.recognizedPlate ?? 'desconhecida'
      }? A movimentação não aparecerá mais para revisão.`,
    );
  }

  protected descartarSelecionados(): void {
    const ids = [...this.selecionados()];
    if (ids.length === 0) return;

    void this.confirmarDescarte(
      ids,
      'Descartar movimentações',
      `Descartar ${ids.length} ${
        ids.length === 1 ? 'movimentação selecionada' : 'movimentações selecionadas'
      }? Elas não aparecerão mais para revisão.`,
    );
  }

  protected abrirRevisao(movimento: PendingReviewMovement): void {
    const ref = this.dialog.create<PendingReviewDialog, PendingReviewMovement>({
      zContent: PendingReviewDialog,
      zData: movimento,
      zViewContainerRef: this.vcr,
      zTitle: 'Confirmar movimentação',
      zDescription:
        'Corrija a placa lida pela câmera ou cadastre o veículo para confirmar a movimentação.',
      zHideFooter: true,
      zWidth: '26rem',
      zMaskClosable: false,
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.carregar();
      }
    });
  }

  protected async carregar(): Promise<void> {
    this.loading.set(true);
    try {
      const [movimentos, pontos] = await Promise.all([
        firstValueFrom(this.movementService.pendingReview()),
        firstValueFrom(this.pointService.list()),
      ]);
      this.movimentos.set(movimentos);
      this.pontos.set(Object.fromEntries(pontos.map((p) => [p.id, p.name])));
      this.selecionados.set(new Set());
    } catch (error) {
      this.logger.error('Falha ao carregar movimentações pendentes', error);
      toast.error('Falha ao carregar movimentações pendentes.');
    } finally {
      this.loading.set(false);
    }
  }

  private async confirmarDescarte(
    ids: string[],
    titulo: string,
    descricao: string,
  ): Promise<void> {
    const ref = this.alertDialog.confirm({
      zTitle: titulo,
      zDescription: descricao,
      zOkText: 'Descartar',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    const result = await firstValueFrom(ref.afterClosed.pipe(take(1)));
    if (!result) return;

    this.descartando.set(true);
    try {
      await firstValueFrom(this.movementService.discard({ ids }));
      toast.success(
        ids.length === 1
          ? 'Movimentação descartada com sucesso.'
          : `${ids.length} movimentações descartadas com sucesso.`,
      );
      await this.carregar();
    } catch (error) {
      this.logger.error('Falha ao descartar movimentações', error);
      toast.error('Falha ao descartar movimentações.');
    } finally {
      this.descartando.set(false);
    }
  }
}
