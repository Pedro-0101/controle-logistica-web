import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

import type { ApiError, CreateUserRequest, ManagedUser, UpdateUserRequest, UserRole } from '@/shared/models';
import { LoggerService } from '@/shared/services/logger.service';
import { UserService } from '@/shared/services/user.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface UserFormModel {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
];

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="userForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label [zRequired]="true" for="user-name">Nome</z-form-label>
        <z-form-control>
          <input
            z-input
            #nameInput
            id="user-name"
            type="text"
            [formField]="userForm.name"
            autocomplete="off"
            placeholder="Nome completo"
            [attr.aria-invalid]="userForm.name().invalid() && userForm.name().touched()"
            [attr.aria-describedby]="userForm.name().errors().length ? 'user-name-error' : null"
          />
        </z-form-control>
        @if (userForm.name().invalid() && userForm.name().touched()) {
          <z-form-message id="user-name-error" [zError]="true">{{ firstError(userForm.name()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="user-email">E-mail</z-form-label>
        <z-form-control>
          <input
            z-input
            id="user-email"
            type="email"
            [formField]="userForm.email"
            autocomplete="off"
            inputmode="email"
            placeholder="seu@email.com"
            [attr.aria-invalid]="userForm.email().invalid() && userForm.email().touched()"
            [attr.aria-describedby]="userForm.email().errors().length ? 'user-email-error' : null"
          />
        </z-form-control>
        @if (userForm.email().invalid() && userForm.email().touched()) {
          <z-form-message id="user-email-error" [zError]="true">{{ firstError(userForm.email()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="!isEdit()" for="user-password">Senha</z-form-label>
        <z-form-control>
          <input
            z-input
            id="user-password"
            [zPass]="true"
            [zMinlength]="6"
            [formField]="userForm.password"
            autocomplete="new-password"
            [placeholder]="isEdit() ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'"
            [attr.aria-invalid]="userForm.password().invalid() && userForm.password().touched()"
            [attr.aria-describedby]="userForm.password().errors().length ? 'user-password-error' : null"
          />
        </z-form-control>
        @if (userForm.password().invalid() && userForm.password().touched()) {
          <z-form-message id="user-password-error" [zError]="true">{{ firstError(userForm.password()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="user-role">Função</z-form-label>
        <z-form-control>
          <select z-input id="user-role" [formField]="userForm.role">
            @for (option of roleOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </z-form-control>
      </z-form-field>

      <div class="flex justify-end gap-2 pt-2">
        <button z-button zType="outline" zSize="default" type="button" (click)="cancelar()">Cancelar</button>
        <button
          z-button
          zType="default"
          zSize="default"
          type="submit"
          [zLoading]="submitting()"
          [zDisabled]="userForm().invalid()"
        >
          {{ isEdit() ? 'Salvar' : 'Criar' }}
        </button>
      </div>
    </form>
  `,
})
export class UserFormDialog {
  private readonly dialogRef = inject(ZardDialogRef<UserFormDialog, ManagedUser>);
  private readonly data = inject<ManagedUser | null>(Z_MODAL_DATA);
  private readonly userService = inject(UserService);
  private readonly logger = inject(LoggerService).create('UserFormDialog');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly isEdit = computed(() => this.data !== null);
  protected readonly submitting = signal(false);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<UserFormModel>({
    name: this.data?.name ?? '',
    email: this.data?.email ?? '',
    password: '',
    role: this.data?.role ?? 'user',
  });

  protected readonly userForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome.' });
      required(fields.email, { message: 'Informe o e-mail.' });
      email(fields.email, { message: 'E-mail inválido.' });
      required(fields.password, { message: 'Informe a senha.', when: () => !this.isEdit() });
      minLength(fields.password, 6, {
        message: 'A senha deve ter no mínimo 6 caracteres.',
        when: () => this.model().password.length > 0,
      });
      required(fields.role, { message: 'Informe a função.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const saved = this.data
              ? await this.salvarEdicao(this.data, model)
              : await this.criarUsuario(model);

            this.logger.info('Usuário salvo', { id: saved.id });
            toast.success(this.data ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
            this.dialogRef.close(saved);
          } catch (error) {
            this.logger.error('Falha ao salvar usuário', error);
            const message = (error as ApiError).message || 'Falha ao salvar usuário.';
            toast.error(message);
          } finally {
            this.submitting.set(false);
          }
        },
      },
    },
  );

  constructor() {
    afterNextRender(() => {
      const input = this.nameInput()?.nativeElement ?? null;
      input?.focus();
    });
  }

  protected firstError(field: FieldState<string, string>): string {
    const errors = field.errors();
    return errors.length ? errors[0].message ?? 'Valor inválido.' : '';
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  private async criarUsuario(model: UserFormModel): Promise<ManagedUser> {
    const payload: CreateUserRequest = {
      name: model.name,
      email: model.email,
      password: model.password,
      role: model.role,
    };
    return firstValueFrom(this.userService.create(payload));
  }

  private async salvarEdicao(usuario: ManagedUser, model: UserFormModel): Promise<ManagedUser> {
    const payload: UpdateUserRequest = {
      name: model.name,
      email: model.email,
      role: model.role,
      ...(model.password ? { password: model.password } : {}),
    };
    return firstValueFrom(this.userService.update(usuario.id, payload));
  }
}
