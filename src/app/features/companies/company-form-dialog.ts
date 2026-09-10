import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NgIcon } from '@ng-icons/core';

import type {
  ApiError,
  Company,
  CreateCompanyRequest,
  CreateCompanyResponse,
  UpdateCompanyRequest,
} from '@/shared/models';
import { CompanyService } from '@/shared/services/company.service';
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

interface CompanyFormModel {
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
  active: boolean;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

type WizardStep = 'company' | 'admin';

@Component({
  selector: 'app-company-form-dialog',
  imports: [
    FormRoot,
    FormField,
    NgIcon,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="companyForm" class="flex flex-col gap-4" novalidate>
      @if (isCreate()) {
        <p class="text-xs text-muted-foreground" aria-live="polite">
          Etapa {{ step() === 'company' ? 1 : 2 }} de 2 — {{ step() === 'company' ? 'Dados da empresa' : 'Administrador' }}
        </p>
      }

      @if (step() === 'company') {
        <z-form-field>
          <z-form-label [zRequired]="true" for="company-name">Nome fantasia</z-form-label>
          <z-form-control>
            <input
              z-input
              #nameInput
              id="company-name"
              type="text"
              [formField]="companyForm.name"
              autocomplete="off"
              placeholder="Ex.: Logística Sul"
              [attr.aria-invalid]="companyForm.name().invalid() && companyForm.name().touched()"
              [attr.aria-describedby]="companyForm.name().errors().length ? 'company-name-error' : null"
            />
          </z-form-control>
          @if (companyForm.name().invalid() && companyForm.name().touched()) {
            <z-form-message id="company-name-error" [zError]="true">{{ firstError(companyForm.name()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="company-company-name">Razão social</z-form-label>
          <z-form-control>
            <input
              z-input
              id="company-company-name"
              type="text"
              [formField]="companyForm.companyName"
              autocomplete="off"
              placeholder="Ex.: Logística Sul LTDA"
              [attr.aria-invalid]="companyForm.companyName().invalid() && companyForm.companyName().touched()"
              [attr.aria-describedby]="companyForm.companyName().errors().length ? 'company-company-name-error' : null"
            />
          </z-form-control>
          @if (companyForm.companyName().invalid() && companyForm.companyName().touched()) {
            <z-form-message id="company-company-name-error" [zError]="true">{{ firstError(companyForm.companyName()) }}</z-form-message>
          }
        </z-form-field>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <z-form-field>
            <z-form-label [zRequired]="true" for="company-cnpj">CNPJ</z-form-label>
            <z-form-control>
              <input
                z-input
                id="company-cnpj"
                type="text"
                [formField]="companyForm.cnpj"
                autocomplete="off"
                placeholder="00.000.000/0000-00"
                [attr.aria-invalid]="companyForm.cnpj().invalid() && companyForm.cnpj().touched()"
                [attr.aria-describedby]="companyForm.cnpj().errors().length ? 'company-cnpj-error' : null"
              />
            </z-form-control>
            @if (companyForm.cnpj().invalid() && companyForm.cnpj().touched()) {
              <z-form-message id="company-cnpj-error" [zError]="true">{{ firstError(companyForm.cnpj()) }}</z-form-message>
            }
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="company-state-registration">Inscrição estadual</z-form-label>
            <z-form-control>
              <input
                z-input
                id="company-state-registration"
                type="text"
                [formField]="companyForm.stateRegistration"
                autocomplete="off"
                placeholder="000.000.000"
                [attr.aria-invalid]="companyForm.stateRegistration().invalid() && companyForm.stateRegistration().touched()"
                [attr.aria-describedby]="companyForm.stateRegistration().errors().length ? 'company-state-registration-error' : null"
              />
            </z-form-control>
            @if (companyForm.stateRegistration().invalid() && companyForm.stateRegistration().touched()) {
              <z-form-message id="company-state-registration-error" [zError]="true">{{ firstError(companyForm.stateRegistration()) }}</z-form-message>
            }
          </z-form-field>
        </div>

        <z-form-field>
          <z-form-label [zRequired]="true" for="company-address">Endereço</z-form-label>
          <z-form-control>
            <input
              z-input
              id="company-address"
              type="text"
              [formField]="companyForm.address"
              autocomplete="off"
              placeholder="Rua Principal, 123 - Centro"
              [attr.aria-invalid]="companyForm.address().invalid() && companyForm.address().touched()"
              [attr.aria-describedby]="companyForm.address().errors().length ? 'company-address-error' : null"
            />
          </z-form-control>
          @if (companyForm.address().invalid() && companyForm.address().touched()) {
            <z-form-message id="company-address-error" [zError]="true">{{ firstError(companyForm.address()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="company-email">E-mail</z-form-label>
          <z-form-control>
            <input
              z-input
              id="company-email"
              type="email"
              [formField]="companyForm.email"
              autocomplete="off"
              inputmode="email"
              placeholder="empresa@email.com"
              [attr.aria-invalid]="companyForm.email().invalid() && companyForm.email().touched()"
              [attr.aria-describedby]="companyForm.email().errors().length ? 'company-email-error' : null"
            />
          </z-form-control>
          @if (companyForm.email().invalid() && companyForm.email().touched()) {
            <z-form-message id="company-email-error" [zError]="true">{{ firstError(companyForm.email()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-control>
            <label class="flex items-center gap-2 text-sm font-medium leading-none">
              <z-checkbox [formField]="companyForm.active" />
              Empresa ativa
            </label>
          </z-form-control>
        </z-form-field>
      } @else {
        <z-form-field>
          <z-form-label [zRequired]="true" for="company-admin-name">Nome do administrador</z-form-label>
          <z-form-control>
            <input
              z-input
              #adminNameInput
              id="company-admin-name"
              type="text"
              [formField]="companyForm.adminName"
              autocomplete="off"
              placeholder="Nome completo"
              [attr.aria-invalid]="companyForm.adminName().invalid() && companyForm.adminName().touched()"
              [attr.aria-describedby]="companyForm.adminName().errors().length ? 'company-admin-name-error' : null"
            />
          </z-form-control>
          @if (companyForm.adminName().invalid() && companyForm.adminName().touched()) {
            <z-form-message id="company-admin-name-error" [zError]="true">{{ firstError(companyForm.adminName()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="company-admin-email">E-mail do administrador</z-form-label>
          <z-form-control>
            <input
              z-input
              id="company-admin-email"
              type="email"
              [formField]="companyForm.adminEmail"
              autocomplete="off"
              inputmode="email"
              placeholder="admin@email.com"
              [attr.aria-invalid]="companyForm.adminEmail().invalid() && companyForm.adminEmail().touched()"
              [attr.aria-describedby]="companyForm.adminEmail().errors().length ? 'company-admin-email-error' : null"
            />
          </z-form-control>
          @if (companyForm.adminEmail().invalid() && companyForm.adminEmail().touched()) {
            <z-form-message id="company-admin-email-error" [zError]="true">{{ firstError(companyForm.adminEmail()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="company-admin-password">Senha do administrador</z-form-label>
          <z-form-control>
            <input
              z-input
              id="company-admin-password"
              [zPass]="true"
              [zMinlength]="6"
              [formField]="companyForm.adminPassword"
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
              [attr.aria-invalid]="companyForm.adminPassword().invalid() && companyForm.adminPassword().touched()"
              [attr.aria-describedby]="companyForm.adminPassword().errors().length ? 'company-admin-password-error' : null"
            />
          </z-form-control>
          @if (companyForm.adminPassword().invalid() && companyForm.adminPassword().touched()) {
            <z-form-message id="company-admin-password-error" [zError]="true">{{ firstError(companyForm.adminPassword()) }}</z-form-message>
          }
        </z-form-field>
      }

      <div class="flex items-center justify-between gap-2 pt-2">
        <button
          z-button
          zType="outline"
          zSize="default"
          type="button"
          [class.invisible]="step() === 'company'"
          (click)="voltar()"
        >
          <ng-icon name="lucideChevronLeft" aria-hidden="true" />
          Voltar
        </button>

        <div class="flex gap-2">
          <button z-button zType="ghost" zSize="default" type="button" (click)="cancelar()">Cancelar</button>
          @if (isCreate() && step() === 'company') {
            <button z-button zType="default" zSize="default" type="button" (click)="avancar()">
              Próximo
              <ng-icon name="lucideChevronRight" aria-hidden="true" />
            </button>
          } @else {
            <button
              z-button
              zType="default"
              zSize="default"
              type="submit"
              [zLoading]="submitting()"
              [zDisabled]="companyForm().invalid()"
            >
              {{ isCreate() ? 'Criar' : 'Salvar' }}
            </button>
          }
        </div>
      </div>
    </form>
  `,
})
export class CompanyFormDialog {
  private readonly dialogRef = inject(ZardDialogRef<CompanyFormDialog, Company>);
  private readonly data = inject<Company | null>(Z_MODAL_DATA);
  private readonly companyService = inject(CompanyService);
  private readonly logger = inject(LoggerService).create('CompanyFormDialog');

  protected readonly isCreate = computed(() => this.data === null);
  protected readonly submitting = signal(false);
  protected readonly step = signal<WizardStep>('company');

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly adminNameInput = viewChild<ElementRef<HTMLInputElement>>('adminNameInput');

  private readonly model = signal<CompanyFormModel>({
    name: this.data?.name ?? '',
    companyName: this.data?.companyName ?? '',
    cnpj: this.data?.cnpj ?? '',
    stateRegistration: this.data?.stateRegistration ?? '',
    address: this.data?.address ?? '',
    email: this.data?.email ?? '',
    active: this.data?.active ?? true,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  protected readonly companyForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome fantasia.' });
      required(fields.companyName, { message: 'Informe a razão social.' });
      required(fields.cnpj, { message: 'Informe o CNPJ.' });
      required(fields.stateRegistration, { message: 'Informe a inscrição estadual.' });
      required(fields.address, { message: 'Informe o endereço.' });
      required(fields.email, { message: 'Informe o e-mail.' });
      email(fields.email, { message: 'E-mail inválido.' });
      required(fields.adminName, { message: 'Informe o nome do administrador.', when: () => this.isCreate() });
      required(fields.adminEmail, { message: 'Informe o e-mail do administrador.', when: () => this.isCreate() });
      email(fields.adminEmail, { message: 'E-mail inválido.', when: () => this.isCreate() });
      required(fields.adminPassword, { message: 'Informe a senha do administrador.', when: () => this.isCreate() });
      minLength(fields.adminPassword, 6, {
        message: 'A senha deve ter no mínimo 6 caracteres.',
        when: () => this.isCreate() && this.model().adminPassword.length > 0,
      });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const data = this.data;

            if (data) {
              const saved = await this.salvarEdicao(data, model);
              this.logger.info('Empresa salva', { id: saved.id });
              toast.success('Empresa atualizada com sucesso.');
              this.dialogRef.close(saved);
            } else {
              const saved = await this.criarEmpresa(model);
              this.logger.info('Empresa salva', { id: saved.company.id });
              toast.success('Empresa criada com sucesso.');
              this.dialogRef.close(saved.company);
            }
          } catch (error) {
            this.logger.error('Falha ao salvar empresa', error);
            const message = (error as ApiError).message || 'Falha ao salvar empresa.';
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

  protected avancar(): void {
    const fields = [
      this.companyForm.name(),
      this.companyForm.companyName(),
      this.companyForm.cnpj(),
      this.companyForm.stateRegistration(),
      this.companyForm.address(),
      this.companyForm.email(),
    ];
    fields.forEach((field) => field.markAsTouched());
    if (fields.some((field) => field.invalid())) return;

    this.step.set('admin');
    this.adminNameInput()?.nativeElement.focus();
  }

  protected voltar(): void {
    this.step.set('company');
  }

  private async criarEmpresa(model: CompanyFormModel): Promise<CreateCompanyResponse> {
    const payload: CreateCompanyRequest = {
      name: model.name,
      companyName: model.companyName,
      cnpj: model.cnpj,
      stateRegistration: model.stateRegistration,
      address: model.address,
      email: model.email,
      active: model.active,
      admin: {
        name: model.adminName,
        email: model.adminEmail,
        password: model.adminPassword,
      },
    };
    return firstValueFrom(this.companyService.create(payload));
  }

  private async salvarEdicao(empresa: Company, model: CompanyFormModel): Promise<Company> {
    const payload: UpdateCompanyRequest = {
      name: model.name,
      companyName: model.companyName,
      cnpj: model.cnpj,
      stateRegistration: model.stateRegistration,
      address: model.address,
      email: model.email,
      active: model.active,
    };
    return firstValueFrom(this.companyService.update(empresa.id, payload));
  }
}
