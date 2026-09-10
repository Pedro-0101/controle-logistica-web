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
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/shared/services/user.service';
import { TitleCasePipe } from '@/shared/core/pipes';
import type { ManagedUser, UserRole } from '@/shared/models';

import { UserFormDialog } from './user-form-dialog';

type RoleBadgeType = 'default' | 'secondary' | 'outline';

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Usuário',
  admin: 'Administrador',
  supervisor: 'Supervisor',
};

@Component({
  selector: 'app-users',
  imports: [
    SiteHeader,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardTableImports,
    NgIcon,
    TitleCasePipe,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div class="flex items-start justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Gerenciar usuários</h1>
          <p class="text-sm text-muted-foreground">Cadastre, edite e remova os usuários do sistema.</p>
        </div>

        <button z-button zSize="sm" type="button" (click)="abrirCriar()">
          <ng-icon name="lucidePlus" aria-hidden="true" />
          Novo usuário
        </button>
      </div>

      <z-card>
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>Nome</th>
              <th z-table-head>E-mail</th>
              <th z-table-head>Função</th>
              <th z-table-head class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @if (loading()) {
              <tr z-table-row>
                <td z-table-cell colspan="4" class="py-10 text-center text-muted-foreground">Carregando...</td>
              </tr>
            } @else {
              @for (usuario of usuarios(); track usuario.id) {
                <tr z-table-row>
                  <td z-table-cell class="font-medium text-foreground">{{ usuario.name | titleCase }}</td>
                  <td z-table-cell>{{ usuario.email }}</td>
                  <td z-table-cell>
                    <z-badge [zType]="roleBadgeType(usuario.role)" zShape="default">{{ roleLabel(usuario.role) }}</z-badge>
                  </td>
                  <td z-table-cell class="text-right">
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="abrirEditar(usuario)"
                      [attr.aria-label]="'Editar ' + usuario.name"
                    >
                      <ng-icon name="lucidePencil" aria-hidden="true" />
                    </button>
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      (click)="confirmarExclusao(usuario)"
                      [attr.aria-label]="'Excluir ' + usuario.name"
                    >
                      <ng-icon name="lucideTrash2" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr z-table-row>
                  <td z-table-cell colspan="4" class="py-10 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
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
export class Users implements OnInit {
  private readonly userService = inject(UserService);
  private readonly dialog = inject(ZardDialogService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Users');

  protected readonly usuarios = signal<ManagedUser[]>([]);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    void this.carregar();
  }

  protected roleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected roleBadgeType(role: UserRole): RoleBadgeType {
    switch (role) {
      case 'admin':
        return 'default';
      case 'supervisor':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  protected abrirCriar(): void {
    this.abrirDialog(null);
  }

  protected abrirEditar(usuario: ManagedUser): void {
    this.abrirDialog(usuario);
  }

  protected confirmarExclusao(usuario: ManagedUser): void {
    const ref = this.alertDialog.confirm({
      zTitle: 'Excluir usuário',
      zDescription: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      zOkText: 'Excluir',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => ({ confirmed: true }),
    });

    ref.afterClosed.pipe(take(1)).subscribe((result) => {
      if (result) {
        void this.excluir(usuario);
      }
    });
  }

  private abrirDialog(usuario: ManagedUser | null): void {
    const ref = this.dialog.create<UserFormDialog, ManagedUser | null>({
      zContent: UserFormDialog,
      zData: usuario,
      zViewContainerRef: this.vcr,
      zTitle: usuario ? 'Editar usuário' : 'Novo usuário',
      zDescription: usuario ? 'Atualize os dados do usuário.' : 'Preencha os dados para criar um novo usuário.',
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
      this.usuarios.set(await firstValueFrom(this.userService.list()));
    } catch (error) {
      this.logger.error('Falha ao carregar usuários', error);
      toast.error('Falha ao carregar usuários.');
    } finally {
      this.loading.set(false);
    }
  }

  private async excluir(usuario: ManagedUser): Promise<void> {
    try {
      await firstValueFrom(this.userService.remove(usuario.id));
      toast.success('Usuário excluído com sucesso.');
      void this.carregar();
    } catch (error) {
      this.logger.error('Falha ao excluir usuário', error);
      toast.error('Falha ao excluir usuário.');
    }
  }
}
