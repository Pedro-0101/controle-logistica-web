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
import { VehicleService } from '@/shared/services/vehicle.service';
import { SessionService } from '@/shared/core/auth/session.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { Vehicle, VehicleType } from '@/shared/models';

import { VehicleFormDialog } from './vehicle-form-dialog';

type StatusBadgeType = 'default' | 'outline';

const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  own: 'Próprio',
  thirdParty: 'Terceiro',
  visitor: 'Visitante',
};

@Component({
  selector: 'app-vehicles',
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
          <h1 class="text-lg font-semibold">Gerenciar veículos</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova os veículos do sistema.</p>
        </div>

        @if (canManage()) {
          <button z-button zSize="sm" type="button" (click)="abrirCriar()">
            <ng-icon name="lucidePlus" aria-hidden="true" />
            Novo veículo
          </button>
        }
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Placa</th>
              <th z-table-head>Código</th>
              <th z-table-head>Tipo</th>
              <th z-table-head>Status</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @if (loading()) {
              <tr z-table-row>
                <td z-table-cell colspan="5" class="py-10 text-center text-muted-foreground">Carregando...</td>
              </tr>
            } @else {
              @for (veiculo of veiculos(); track veiculo.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ veiculo.plate }}</td>
                  <td z-table-cell>{{ veiculo.code }}</td>
                  <td z-table-cell>{{ vehicleTypeLabel(veiculo.type) }}</td>
                  <td z-table-cell>
                    <z-badge [zType]="statusBadgeType(veiculo.active)" zShape="default">
                      {{ veiculo.active ? 'Ativo' : 'Inativo' }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    @if (canManage()) {
                      <button
                        z-button
                        zType="ghost"
                        zSize="icon"
                        type="button"
                        (click)="abrirEditar(veiculo)"
                        [attr.aria-label]="'Editar veículo ' + veiculo.plate"
                      >
                        <ng-icon name="lucidePencil" aria-hidden="true" />
                      </button>
                      <button
                        z-button
                        zType="ghost"
                        zSize="icon"
                        type="button"
                        (click)="confirmarExclusao(veiculo)"
                        [attr.aria-label]="'Excluir veículo ' + veiculo.plate"
                      >
                        <ng-icon name="lucideTrash2" aria-hidden="true" />
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="5" class="py-10 text-center text-muted-foreground">
                    Nenhum veículo cadastrado.
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
export class Vehicles implements OnInit {
  private readonly vehicleService = inject(VehicleService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Vehicles');

  protected readonly veiculos = signal<Vehicle[]>([]);
  protected readonly loading = signal(false);
  protected readonly canManage = computed(() => {
    const role = this.session.usuario()?.role;
    return role === 'admin' || role === 'supervisor';
  });

  protected readonly vehicleTypeLabel = (type: VehicleType): string => VEHICLE_TYPE_LABEL[type] ?? type;

  ngOnInit(): void {
    void this.carregar();
  }

  protected statusBadgeType(active: boolean): StatusBadgeType {
    return active ? 'default' : 'outline';
  }

  protected abrirCriar(): void {
    this.abrirDialog(null);
  }

  protected abrirEditar(veiculo: Vehicle): void {
    this.abrirDialog(veiculo);
  }

  protected confirmarExclusao(veiculo: Vehicle): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir veículo',
      zDescription: 'Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(veiculo);
      }
    });
  }

  private abrirDialog(veiculo: Vehicle | null): void {
    const ref = this.dialog.create<VehicleFormDialog, Vehicle | null>({
      zContent: VehicleFormDialog,
      zData: veiculo,
      zViewContainerRef: this.vcr,
      zTitle: veiculo ? 'Editar veículo' : 'Novo veículo',
      zDescription: veiculo ? 'Atualize os dados do veículo.' : 'Preencha os dados para criar um novo veículo.',
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
      this.veiculos.set(await firstValueFrom(this.vehicleService.list()));
    } catch (error) {
      this.logger.error('Falha ao carregar veículos', error);
      toast.error('Falha ao carregar veículos.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(veiculo: Vehicle): Promise<void> {
    try {
      await firstValueFrom(this.vehicleService.remove(veiculo.id));
      toast.success('Veículo excluído com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir veículo', error);
      toast.error('Falha ao excluir veículo.');
    }
  }
}
