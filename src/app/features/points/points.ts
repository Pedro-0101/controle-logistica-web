import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NgIcon } from '@ng-icons/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardAlertDialogService } from '@/shared/components/alert-dialog';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDialogService } from '@/shared/components/dialog';
import { ZardTableImports } from '@/shared/components/table';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { CompanyService } from '@/shared/services/company.service';
import { PointService } from '@/shared/services/point.service';
import { SessionService } from '@/shared/core/auth/session.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { AdminUnity, Company, Point, PointType } from '@/shared/models';

import { PointFormDialog } from './point-form-dialog';

type StatusBadgeType = 'default' | 'outline';

const POINT_TYPE_LABELS: Record<PointType, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  both: 'Entrada/Saída',
};

@Component({
  selector: 'app-points',
  imports: [
    SiteHeader,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardTableImports,
    NgIcon,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Gerenciar pontos</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova os pontos de controle do sistema.</p>
        </div>

        @if (canManage()) {
          <button z-button zSize="sm" type="button" (click)="abrirCriar()">
            <ng-icon name="lucidePlus" aria-hidden="true" />
            Novo ponto
          </button>
        }
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Nome</th>
              <th z-table-head>Código</th>
              <th z-table-head>Tipo</th>
              <th z-table-head>Unidade</th>
              <th z-table-head>Empresa</th>
              <th z-table-head>Status</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @if (loading()) {
              <tr z-table-row>
                <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">Carregando...</td>
              </tr>
            } @else {
              @for (ponto of pontos(); track ponto.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ ponto.name }}</td>
                  <td z-table-cell>{{ ponto.code }}</td>
                  <td z-table-cell>{{ pointTypeLabel(ponto.type) }}</td>
                  <td z-table-cell>{{ adminUnityName(ponto.adminUnityId) }}</td>
                  <td z-table-cell>{{ companyName(ponto.companyId) }}</td>
                  <td z-table-cell>
                    <z-badge [zType]="statusBadgeType(ponto.active)" zShape="default">
                      {{ ponto.active ? 'Ativo' : 'Inativo' }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    @if (canManage()) {
                      <button
                        z-button
                        zType="ghost"
                        zSize="icon"
                        type="button"
                        (click)="abrirEditar(ponto)"
                        [attr.aria-label]="'Editar ' + ponto.name"
                      >
                        <ng-icon name="lucidePencil" aria-hidden="true" />
                      </button>
                      <button
                        z-button
                        zType="ghost"
                        zSize="icon"
                        type="button"
                        (click)="confirmarExclusao(ponto)"
                        [attr.aria-label]="'Excluir ' + ponto.name"
                      >
                        <ng-icon name="lucideTrash2" aria-hidden="true" />
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                    Nenhum ponto cadastrado.
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </z-card>
    </main>
  `,
})
export class Points implements OnInit {
  private readonly pointService = inject(PointService);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly companyService = inject(CompanyService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Points');

  protected readonly pontos = signal<Point[]>([]);
  protected readonly adminUnities = signal<AdminUnity[]>([]);
  protected readonly companies = signal<Company[]>([]);
  protected readonly loading = signal(false);
  protected readonly canManage = computed(() => {
    const role = this.session.usuario()?.role;
    return role === 'admin' || role === 'supervisor';
  });

  ngOnInit(): void {
    void this.carregar();
  }

  protected pointTypeLabel(type: PointType): string {
    return POINT_TYPE_LABELS[type];
  }

  protected adminUnityName(adminUnityId: string): string {
    return this.adminUnities().find((unit) => unit.id === adminUnityId)?.name ?? adminUnityId;
  }

  protected companyName(companyId: string): string {
    return this.companies().find((company) => company.id === companyId)?.name ?? companyId;
  }

  protected statusBadgeType(active: boolean): StatusBadgeType {
    return active ? 'default' : 'outline';
  }

  protected abrirCriar(): void {
    this.abrirDialog(null);
  }

  protected abrirEditar(ponto: Point): void {
    this.abrirDialog(ponto);
  }

  protected confirmarExclusao(ponto: Point): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir ponto',
      zDescription: 'Tem certeza que deseja excluir este ponto? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(ponto);
      }
    });
  }

  private abrirDialog(ponto: Point | null): void {
    const ref = this.dialog.create<PointFormDialog, Point | null>({
      zContent: PointFormDialog,
      zData: ponto,
      zViewContainerRef: this.vcr,
      zTitle: ponto ? 'Editar ponto' : 'Novo ponto',
      zDescription: ponto ? 'Atualize os dados do ponto.' : 'Preencha os dados para criar um novo ponto.',
      zHideFooter: true,
      zWidth: '40rem',
      zMaskClosable: false,
      zClosable: false,
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.carregar();
      }
    });
  }

  private async carregar(): Promise<void> {
    this.loading.set(true);
    try {
      const [pontos, adminUnities, companies] = await Promise.all([
        firstValueFrom(this.pointService.list()),
        firstValueFrom(this.adminUnityService.list()),
        firstValueFrom(this.companyService.list()),
      ]);
      this.pontos.set(pontos);
      this.adminUnities.set(adminUnities);
      this.companies.set(companies);
    } catch (error) {
      this.logger.error('Falha ao carregar pontos', error);
      toast.error('Falha ao carregar pontos.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(ponto: Point): Promise<void> {
    try {
      await firstValueFrom(this.pointService.remove(ponto.id));
      toast.success('Ponto excluído com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir ponto', error);
      toast.error('Falha ao excluir ponto.');
    }
  }
}
