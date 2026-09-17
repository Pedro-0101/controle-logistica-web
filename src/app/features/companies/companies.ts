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
import { CompanyService } from '@/shared/services/company.service';
import { CompanyConfigService } from '@/shared/services/company-config.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { Company } from '@/shared/models';

import { CompanyFormDialog } from './company-form-dialog';
import { CompanyConfigDialog, type ConfigDialogData } from './company-config-dialog';

type StatusBadgeType = 'default' | 'outline';

@Component({
  selector: 'app-companies',
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
          <h1 class="text-lg font-semibold">Gerenciar empresas</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova as empresas do sistema.</p>
        </div>

        <button z-button zSize="sm" type="button" (click)="abrirCriar()">
          <ng-icon name="lucidePlus" aria-hidden="true" />
          Nova empresa
        </button>
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Nome</th>
              <th z-table-head>Razão social</th>
              <th z-table-head>CNPJ</th>
              <th z-table-head>E-mail</th>
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
              @for (empresa of empresas(); track empresa.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ empresa.name }}</td>
                  <td z-table-cell>{{ empresa.companyName }}</td>
                  <td z-table-cell>{{ empresa.cnpj }}</td>
                  <td z-table-cell>{{ empresa.email }}</td>
                  <td z-table-cell>
                    <z-badge [zType]="statusBadgeType(empresa.active)" zShape="default">
                      {{ empresa.active ? 'Ativa' : 'Inativa' }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirConfig(empresa)"
                      [attr.aria-label]="'Configurações de ' + empresa.name"
                    >
                      <ng-icon name="lucideSettings" aria-hidden="true" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirEditar(empresa)"
                      [attr.aria-label]="'Editar ' + empresa.name"
                    >
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="confirmarExclusao(empresa)"
                      [attr.aria-label]="'Excluir ' + empresa.name"
                    >
                      <ng-icon name="lucideTrash2" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="6" class="py-10 text-center text-muted-foreground">
                    Nenhuma empresa cadastrada.
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
export class Companies implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly configService = inject(CompanyConfigService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Companies');

  protected readonly empresas = signal<Company[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    void this.carregar();
  }

  protected statusBadgeType(active: boolean): StatusBadgeType {
    return active ? 'default' : 'outline';
  }

  protected abrirCriar(): void {
    this.abrirDialog(null);
  }

  protected abrirEditar(empresa: Company): void {
    this.abrirDialog(empresa);
  }

  protected async abrirConfig(empresa: Company): Promise<void> {
    try {
      const config = await firstValueFrom(this.configService.get(empresa.id));
      const ref = this.dialog.create<CompanyConfigDialog, ConfigDialogData>({
        zContent: CompanyConfigDialog,
        zData: { companyId: empresa.id, config },
        zViewContainerRef: this.vcr,
        zTitle: `Configurações — ${empresa.name}`,
        zDescription: 'Ajuste as configurações operacionais da empresa.',
        zHideFooter: true,
        zWidth: '44rem',
        zMaskClosable: false,
      });

      ref.afterClosed.pipe(take(1)).subscribe((result) => {
        if (result) {
          void this.carregar();
        }
      });
    } catch (error) {
      this.logger.error('Falha ao carregar configuração', error);
      toast.error('Falha ao carregar configurações da empresa.');
    }
  }

  protected confirmarExclusao(empresa: Company): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir empresa',
      zDescription: 'Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(empresa);
      }
    });
  }

  private abrirDialog(empresa: Company | null): void {
    const ref = this.dialog.create<CompanyFormDialog, Company | null>({
      zContent: CompanyFormDialog,
      zData: empresa,
      zViewContainerRef: this.vcr,
      zTitle: empresa ? 'Editar empresa' : 'Nova empresa',
      zDescription: empresa ? 'Atualize os dados da empresa.' : 'Preencha os dados para criar uma nova empresa.',
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
      this.empresas.set(await firstValueFrom(this.companyService.list()));
    } catch (error) {
      this.logger.error('Falha ao carregar empresas', error);
      toast.error('Falha ao carregar empresas.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(empresa: Company): Promise<void> {
    try {
      await firstValueFrom(this.companyService.remove(empresa.id));
      toast.success('Empresa excluída com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir empresa', error);
      toast.error('Falha ao excluir empresa.');
    }
  }
}
