import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { NgIcon } from '@ng-icons/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { EmptyState } from '@/shared/components/empty-state/empty-state';
import { LoadingSpinner } from '@/shared/components/loading-spinner/loading-spinner';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
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
 * O operador corrige a placa ou cadastra o veículo para confirmar o movimento.
 */
@Component({
  selector: 'app-pending-review',
  imports: [
    SiteHeader,
    EmptyState,
    LoadingSpinner,
    NgIcon,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
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
        <p class="text-sm text-muted-foreground" role="status">
          {{ movimentos().length }}
          {{
            movimentos().length === 1
              ? 'movimentação aguardando revisão'
              : 'movimentações aguardando revisão'
          }}
        </p>

        <div class="grid gap-4 sm:grid-cols-2">
          @for (m of movimentos(); track m.id) {
            <z-card>
              <div class="flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between gap-2">
                  <z-badge [zType]="m.type === 'entry' ? 'default' : 'secondary'" zShape="pill">
                    {{ m.type === 'entry' ? 'Entrada' : 'Saída' }}
                  </z-badge>
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

                <div class="flex justify-end pt-1">
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
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('PendingReview');

  protected readonly movimentos = signal<PendingReviewMovement[]>([]);
  protected readonly pontos = signal<Record<string, string>>({});
  protected readonly loading = signal(false);

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
    } catch (error) {
      this.logger.error('Falha ao carregar movimentações pendentes', error);
      toast.error('Falha ao carregar movimentações pendentes.');
    } finally {
      this.loading.set(false);
    }
  }
}
