import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
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
import { LoggerService } from '@/shared/services/logger.service';
import type { AdminUnity, Company } from '@/shared/models';

import { AdminUnityFormDialog } from './admin-unity-form-dialog';

type StatusBadgeType = 'default' | 'outline';

@Component({
  selector: 'app-admin-unities',
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
          <h1 class="text-lg font-semibold">Gerenciar unidades</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova as unidades administrativas.</p>
        </div>

        <button z-button zSize="sm" type="button" (click)="abrirCriar()">
          <ng-icon name="lucidePlus" aria-hidden="true" />
          Nova unidade
        </button>
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Nome</th>
              <th z-table-head>Código</th>
              <th z-table-head>Endereço</th>
              <th z-table-head>Empresa</th>
              <th z-table-head>Status</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @if (loading()) {
              <tr z-table-row>
                <td z-table-cell colspan="6" class="py-10 text-center text-muted-foreground">Carregando...</td>
              </tr>
            } @else {
              @for (unidade of unidades(); track unidade.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ unidade.name }}</td>
                  <td z-table-cell>{{ unidade.code }}</td>
                  <td z-table-cell>{{ unidade.address }}</td>
                  <td z-table-cell>{{ companyName(unidade.companyId) }}</td>
                  <td z-table-cell>
                    <z-badge [zType]="statusBadgeType(unidade.active)" zShape="default">
                      {{ unidade.active ? 'Ativa' : 'Inativa' }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirEditar(unidade)"
                      [attr.aria-label]="'Editar ' + unidade.name"
                    >
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="confirmarExclusao(unidade)"
                      [attr.aria-label]="'Excluir ' + unidade.name"
                    >
                      <ng-icon name="lucideTrash2" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="6" class="py-10 text-center text-muted-foreground">
                    Nenhuma unidade cadastrada.
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
export class AdminUnities implements OnInit {
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly companyService = inject(CompanyService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('AdminUnities');

  protected readonly unidades = signal<AdminUnity[]>([]);
  protected readonly companies = signal<Company[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    void this.carregar();
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

  protected abrirEditar(unidade: AdminUnity): void {
    this.abrirDialog(unidade);
  }

  protected confirmarExclusao(unidade: AdminUnity): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir unidade',
      zDescription: 'Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(unidade);
      }
    });
  }

  private abrirDialog(unidade: AdminUnity | null): void {
    const ref = this.dialog.create<AdminUnityFormDialog, AdminUnity | null>({
      zContent: AdminUnityFormDialog,
      zData: unidade,
      zViewContainerRef: this.vcr,
      zTitle: unidade ? 'Editar unidade' : 'Nova unidade',
      zDescription: unidade ? 'Atualize os dados da unidade.' : 'Preencha os dados para criar uma nova unidade.',
      zHideFooter: true,
      zWidth: '28rem',
      zMaskClosable: false,
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
      const [unidades, companies] = await Promise.all([
        firstValueFrom(this.adminUnityService.list()),
        firstValueFrom(this.companyService.list()),
      ]);
      this.unidades.set(unidades);
      this.companies.set(companies);
    } catch (error) {
      this.logger.error('Falha ao carregar unidades', error);
      toast.error('Falha ao carregar unidades.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(unidade: AdminUnity): Promise<void> {
    try {
      await firstValueFrom(this.adminUnityService.remove(unidade.id));
      toast.success('Unidade excluída com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir unidade', error);
      toast.error('Falha ao excluir unidade.');
    }
  }
}
