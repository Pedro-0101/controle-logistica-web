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
import { CameraService } from '@/shared/services/camera.service';
import { PointService } from '@/shared/services/point.service';
import { LoggerService } from '@/shared/services/logger.service';
import type { AdminUnity, Camera, Point } from '@/shared/models';

import { CameraFormDialog } from './camera-form-dialog';

@Component({
  selector: 'app-cameras',
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
          <h1 class="text-lg font-semibold">Gerenciar câmeras</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova as câmeras IP do sistema.</p>
        </div>

        <button z-button zSize="sm" type="button" (click)="abrirCriar()">
          <ng-icon name="lucidePlus" aria-hidden="true" />
          Nova câmera
        </button>
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Nome</th>
              <th z-table-head>IP</th>
              <th z-table-head>Porta</th>
              <th z-table-head>Ponto</th>
              <th z-table-head>Unidade</th>
              <th z-table-head>Tipo Auth</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @if (loading()) {
              <tr z-table-row>
                <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">Carregando...</td>
              </tr>
            } @else {
              @for (camera of cameras(); track camera.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ camera.name }}</td>
                  <td z-table-cell>{{ camera.ip }}</td>
                  <td z-table-cell>{{ camera.port }}</td>
                  <td z-table-cell>{{ pointName(camera.pointId) }}</td>
                  <td z-table-cell>{{ adminUnityName(camera.adminUnityId) }}</td>
                  <td z-table-cell>
                    <z-badge zType="secondary" zShape="default">
                      {{ camera.authType === 'digest' ? 'Digest' : 'Basic' }}
                    </z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirEditar(camera)"
                      [attr.aria-label]="'Editar câmera ' + camera.name"
                    >
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="confirmarExclusao(camera)"
                      [attr.aria-label]="'Excluir câmera ' + camera.name"
                    >
                      <ng-icon name="lucideTrash2" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="7" class="py-10 text-center text-muted-foreground">
                    Nenhuma câmera cadastrada.
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
export class Cameras implements OnInit {
  private readonly cameraService = inject(CameraService);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly pointService = inject(PointService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Cameras');

  protected readonly cameras = signal<Camera[]>([]);
  protected readonly adminUnities = signal<AdminUnity[]>([]);
  protected readonly points = signal<Point[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    void this.carregar();
  }

  protected adminUnityName(adminUnityId: string): string {
    return this.adminUnities().find((unit) => unit.id === adminUnityId)?.name ?? adminUnityId;
  }

  protected pointName(pointId: string): string {
    return this.points().find((point) => point.id === pointId)?.name ?? pointId;
  }

  protected abrirCriar(): void {
    this.abrirDialog(null);
  }

  protected abrirEditar(camera: Camera): void {
    this.abrirDialog(camera);
  }

  protected confirmarExclusao(camera: Camera): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir câmera',
      zDescription: 'Tem certeza que deseja excluir esta câmera? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(camera);
      }
    });
  }

  private abrirDialog(camera: Camera | null): void {
    const ref = this.dialog.create<CameraFormDialog, Camera | null>({
      zContent: CameraFormDialog,
      zData: camera,
      zViewContainerRef: this.vcr,
      zTitle: camera ? 'Editar câmera' : 'Nova câmera',
      zDescription: camera ? 'Atualize os dados da câmera.' : 'Preencha os dados para criar uma nova câmera.',
      zHideFooter: true,
      zWidth: '32rem',
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
      const [cameras, adminUnities, points] = await Promise.all([
        firstValueFrom(this.cameraService.list()),
        firstValueFrom(this.adminUnityService.list()),
        firstValueFrom(this.pointService.list()),
      ]);
      this.cameras.set(cameras);
      this.adminUnities.set(adminUnities);
      this.points.set(points);
    } catch (error) {
      this.logger.error('Falha ao carregar câmeras', error);
      toast.error('Falha ao carregar câmeras.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(camera: Camera): Promise<void> {
    try {
      await firstValueFrom(this.cameraService.remove(camera.id));
      toast.success('Câmera excluída com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir câmera', error);
      toast.error('Falha ao excluir câmera.');
    }
  }
}
