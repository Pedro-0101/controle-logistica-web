import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

import type {
  AdminUnity,
  ApiError,
  CreateAdminUnityRequest,
  UpdateAdminUnityRequest,
} from '@/shared/models';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface AdminUnityFormModel {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
}

@Component({
  selector: 'app-admin-unity-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="unitForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label [zRequired]="true" for="unity-name">Nome</z-form-label>
        <z-form-control>
          <input
            z-input
            #nameInput
            id="unity-name"
            type="text"
            [formField]="unitForm.name"
            autocomplete="off"
            placeholder="Unidade Centro"
            [attr.aria-invalid]="unitForm.name().invalid() && unitForm.name().touched()"
            [attr.aria-describedby]="unitForm.name().errors().length ? 'unity-name-error' : null"
          />
        </z-form-control>
        @if (unitForm.name().invalid() && unitForm.name().touched()) {
          <z-form-message id="unity-name-error" [zError]="true">{{ firstError(unitForm.name()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="unity-code">Código</z-form-label>
        <z-form-control>
          <input
            z-input
            id="unity-code"
            type="text"
            [formField]="unitForm.code"
            autocomplete="off"
            placeholder="UA-001"
            [attr.aria-invalid]="unitForm.code().invalid() && unitForm.code().touched()"
            [attr.aria-describedby]="unitForm.code().errors().length ? 'unity-code-error' : null"
          />
        </z-form-control>
        @if (unitForm.code().invalid() && unitForm.code().touched()) {
          <z-form-message id="unity-code-error" [zError]="true">{{ firstError(unitForm.code()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="unity-address">Endereço</z-form-label>
        <z-form-control>
          <input
            z-input
            id="unity-address"
            type="text"
            [formField]="unitForm.address"
            autocomplete="off"
            placeholder="Rua Principal, 123 - Centro"
            [attr.aria-invalid]="unitForm.address().invalid() && unitForm.address().touched()"
            [attr.aria-describedby]="unitForm.address().errors().length ? 'unity-address-error' : null"
          />
        </z-form-control>
        @if (unitForm.address().invalid() && unitForm.address().touched()) {
          <z-form-message id="unity-address-error" [zError]="true">{{ firstError(unitForm.address()) }}</z-form-message>
        }
      </z-form-field>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <z-form-field>
          <z-form-label for="unity-phone">Telefone</z-form-label>
          <z-form-control>
            <input
              z-input
              id="unity-phone"
              type="tel"
              [formField]="unitForm.phone"
              autocomplete="off"
              placeholder="(11) 99999-0000"
            />
          </z-form-control>
        </z-form-field>

        <z-form-field>
          <z-form-label for="unity-email">E-mail</z-form-label>
          <z-form-control>
            <input
              z-input
              id="unity-email"
              type="email"
              [formField]="unitForm.email"
              autocomplete="off"
              inputmode="email"
              placeholder="unidade@email.com"
              [attr.aria-invalid]="unitForm.email().invalid() && unitForm.email().touched()"
              [attr.aria-describedby]="unitForm.email().errors().length ? 'unity-email-error' : null"
            />
          </z-form-control>
          @if (unitForm.email().invalid() && unitForm.email().touched()) {
            <z-form-message id="unity-email-error" [zError]="true">{{ firstError(unitForm.email()) }}</z-form-message>
          }
        </z-form-field>
      </div>

      <z-form-field>
        <z-form-control>
          <label class="flex items-center gap-2 text-sm font-medium leading-none">
            <z-checkbox [formField]="unitForm.active" />
            Unidade ativa
          </label>
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
          [zDisabled]="unitForm().invalid()"
        >
          {{ isEdit() ? 'Salvar' : 'Criar' }}
        </button>
      </div>
    </form>
  `,
})
export class AdminUnityFormDialog {
  private readonly dialogRef = inject(ZardDialogRef<AdminUnityFormDialog, AdminUnity>);
  private readonly data = inject<AdminUnity | null>(Z_MODAL_DATA);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly logger = inject(LoggerService).create('AdminUnityFormDialog');

  protected readonly isEdit = computed(() => this.data !== null);
  protected readonly submitting = signal(false);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<AdminUnityFormModel>({
    name: this.data?.name ?? '',
    code: this.data?.code ?? '',
    address: this.data?.address ?? '',
    phone: this.data?.phone ?? '',
    email: this.data?.email ?? '',
    active: this.data?.active ?? true,
  });

  protected readonly unitForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome.' });
      required(fields.code, { message: 'Informe o código.' });
      required(fields.address, { message: 'Informe o endereço.' });
      email(fields.email, {
        message: 'E-mail inválido.',
        when: () => this.model().email.length > 0,
      });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const saved = this.data
              ? await this.salvarEdicao(this.data, model)
              : await this.criarUnidade(model);

            this.logger.info('Unidade salva', { id: saved.id });
            toast.success(this.data ? 'Unidade atualizada com sucesso.' : 'Unidade criada com sucesso.');
            this.dialogRef.close(saved);
          } catch (error) {
            this.logger.error('Falha ao salvar unidade', error);
            const message = (error as ApiError).message || 'Falha ao salvar unidade.';
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

  private async criarUnidade(model: AdminUnityFormModel): Promise<AdminUnity> {
    const payload: CreateAdminUnityRequest = {
      name: model.name,
      code: model.code,
      address: model.address,
      active: model.active,
      ...(model.phone ? { phone: model.phone } : {}),
      ...(model.email ? { email: model.email } : {}),
    };
    return firstValueFrom(this.adminUnityService.create(payload));
  }

  private async salvarEdicao(unidade: AdminUnity, model: AdminUnityFormModel): Promise<AdminUnity> {
    const payload: UpdateAdminUnityRequest = {
      name: model.name,
      code: model.code,
      address: model.address,
      active: model.active,
      ...(model.phone ? { phone: model.phone } : {}),
      ...(model.email ? { email: model.email } : {}),
    };
    return firstValueFrom(this.adminUnityService.update(unidade.id, payload));
  }
}
