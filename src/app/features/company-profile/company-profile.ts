import { afterNextRender, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NgIcon } from '@ng-icons/core';

import type { ApiError, Company, UpdateCompanyRequest } from '@/shared/models';
import { SessionService } from '@/shared/core/auth';
import { CompanyService } from '@/shared/services/company.service';
import { LoggerService } from '@/shared/services/logger.service';
import { firstError } from '@/shared/utils/form-utils';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface CompanyProfileModel {
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
}

@Component({
  selector: 'app-company-profile',
  imports: [
    SiteHeader,
    FormRoot,
    FormField,
    NgIcon,
    ZardButtonComponent,
    ZardCardComponent,
    ZardFormControlComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Minha empresa</h1>
        <p class="text-sm text-muted-foreground">Visualize e edite os dados da sua empresa.</p>
      </div>

      @if (loading()) {
        <z-card>
          <div class="py-10 text-center text-muted-foreground">Carregando dados da empresa...</div>
        </z-card>
      } @else if (empresa()) {
        <z-card>
          @if (!editing()) {
            <div class="flex flex-col gap-4 p-6">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">Nome fantasia</span>
                <span class="text-sm text-foreground">{{ empresa()!.name }}</span>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">Razão social</span>
                <span class="text-sm text-foreground">{{ empresa()!.companyName }}</span>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-muted-foreground">CNPJ</span>
                  <span class="text-sm text-foreground">{{ empresa()!.cnpj }}</span>
                </div>
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-muted-foreground">Inscrição estadual</span>
                  <span class="text-sm text-foreground">{{ empresa()!.stateRegistration }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">Endereço</span>
                <span class="text-sm text-foreground">{{ empresa()!.address }}</span>
              </div>

              <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">E-mail</span>
                <span class="text-sm text-foreground">{{ empresa()!.email }}</span>
              </div>

              <div class="flex items-center justify-end pt-2">
                <button z-button zType="default" zSize="sm" type="button" (click)="editar()">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                  Editar
                </button>
              </div>
            </div>
          } @else {
            <form [formRoot]="profileForm" class="flex flex-col gap-4 p-6" novalidate>
              <z-form-field>
                <z-form-label [zRequired]="true" for="company-name">Nome fantasia</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="company-name"
                    type="text"
                    [formField]="profileForm.name"
                    autocomplete="off"
                    placeholder="Ex.: Logística Sul"
                    [attr.aria-invalid]="profileForm.name().invalid() && profileForm.name().touched()"
                    [attr.aria-describedby]="profileForm.name().errors().length ? 'company-name-error' : null"
                  />
                </z-form-control>
                @if (profileForm.name().invalid() && profileForm.name().touched()) {
                  <z-form-message id="company-name-error" [zError]="true">{{ getError(profileForm.name()) }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <z-form-label [zRequired]="true" for="company-company-name">Razão social</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="company-company-name"
                    type="text"
                    [formField]="profileForm.companyName"
                    autocomplete="off"
                    placeholder="Ex.: Logística Sul LTDA"
                    [attr.aria-invalid]="profileForm.companyName().invalid() && profileForm.companyName().touched()"
                    [attr.aria-describedby]="profileForm.companyName().errors().length ? 'company-company-name-error' : null"
                  />
                </z-form-control>
                @if (profileForm.companyName().invalid() && profileForm.companyName().touched()) {
                  <z-form-message id="company-company-name-error" [zError]="true">{{ getError(profileForm.companyName()) }}</z-form-message>
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
                      [formField]="profileForm.cnpj"
                      autocomplete="off"
                      placeholder="00.000.000/0000-00"
                      [attr.aria-invalid]="profileForm.cnpj().invalid() && profileForm.cnpj().touched()"
                      [attr.aria-describedby]="profileForm.cnpj().errors().length ? 'company-cnpj-error' : null"
                    />
                  </z-form-control>
                  @if (profileForm.cnpj().invalid() && profileForm.cnpj().touched()) {
                    <z-form-message id="company-cnpj-error" [zError]="true">{{ getError(profileForm.cnpj()) }}</z-form-message>
                  }
                </z-form-field>

                <z-form-field>
                  <z-form-label [zRequired]="true" for="company-state-registration">Inscrição estadual</z-form-label>
                  <z-form-control>
                    <input
                      z-input
                      id="company-state-registration"
                      type="text"
                      [formField]="profileForm.stateRegistration"
                      autocomplete="off"
                      placeholder="000.000.000"
                      [attr.aria-invalid]="profileForm.stateRegistration().invalid() && profileForm.stateRegistration().touched()"
                      [attr.aria-describedby]="profileForm.stateRegistration().errors().length ? 'company-state-registration-error' : null"
                    />
                  </z-form-control>
                  @if (profileForm.stateRegistration().invalid() && profileForm.stateRegistration().touched()) {
                    <z-form-message id="company-state-registration-error" [zError]="true">{{ getError(profileForm.stateRegistration()) }}</z-form-message>
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
                    [formField]="profileForm.address"
                    autocomplete="off"
                    placeholder="Rua Principal, 123 - Centro"
                    [attr.aria-invalid]="profileForm.address().invalid() && profileForm.address().touched()"
                    [attr.aria-describedby]="profileForm.address().errors().length ? 'company-address-error' : null"
                  />
                </z-form-control>
                @if (profileForm.address().invalid() && profileForm.address().touched()) {
                  <z-form-message id="company-address-error" [zError]="true">{{ getError(profileForm.address()) }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <z-form-label [zRequired]="true" for="company-email">E-mail</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="company-email"
                    type="email"
                    [formField]="profileForm.email"
                    autocomplete="off"
                    inputmode="email"
                    placeholder="empresa@email.com"
                    [attr.aria-invalid]="profileForm.email().invalid() && profileForm.email().touched()"
                    [attr.aria-describedby]="profileForm.email().errors().length ? 'company-email-error' : null"
                  />
                </z-form-control>
                @if (profileForm.email().invalid() && profileForm.email().touched()) {
                  <z-form-message id="company-email-error" [zError]="true">{{ getError(profileForm.email()) }}</z-form-message>
                }
              </z-form-field>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button z-button zType="ghost" zSize="default" type="button" (click)="cancelar()">
                  Cancelar
                </button>
                <button
                  z-button
                  zType="default"
                  zSize="default"
                  type="submit"
                  [zLoading]="submitting()"
                  [zDisabled]="profileForm().invalid()"
                >
                  Salvar
                </button>
              </div>
            </form>
          }
        </z-card>
      } @else {
        <z-card>
          <div class="py-10 text-center text-muted-foreground">Empresa não encontrada.</div>
        </z-card>
      }
    </main>
  `,
})
export class CompanyProfile {
  private readonly session = inject(SessionService);
  private readonly companyService = inject(CompanyService);
  private readonly logger = inject(LoggerService).create('CompanyProfile');
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly editing = signal(false);
  protected readonly empresa = signal<Company | null>(null);

  private readonly model = signal<CompanyProfileModel>({
    name: '',
    companyName: '',
    cnpj: '',
    stateRegistration: '',
    address: '',
    email: '',
  });

  protected readonly profileForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome fantasia.' });
      required(fields.companyName, { message: 'Informe a razão social.' });
      required(fields.cnpj, { message: 'Informe o CNPJ.' });
      required(fields.stateRegistration, { message: 'Informe a inscrição estadual.' });
      required(fields.address, { message: 'Informe o endereço.' });
      required(fields.email, { message: 'Informe o e-mail.' });
      email(fields.email, { message: 'E-mail inválido.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const empresa = this.empresa();
          if (!empresa) return;

          const model = this.model();
          const payload: UpdateCompanyRequest = {
            name: model.name,
            companyName: model.companyName,
            cnpj: model.cnpj,
            stateRegistration: model.stateRegistration,
            address: model.address,
            email: model.email,
          };

          try {
            const saved = await firstValueFrom(this.companyService.update(empresa.id, payload));
            this.empresa.set(saved);
            this.editing.set(false);
            this.logger.info('Empresa atualizada', { id: saved.id });
            toast.success('Empresa atualizada com sucesso.');
          } catch (error) {
            this.logger.error('Falha ao atualizar empresa', error);
            const message = (error as ApiError).message || 'Falha ao atualizar empresa.';
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
      void this.carregar();
    });
  }

  protected getError<V>(field: FieldState<V, string>): string {
    return firstError(field);
  }

  protected editar(): void {
    const empresa = this.empresa();
    if (!empresa) return;

    this.model.set({
      name: empresa.name,
      companyName: empresa.companyName,
      cnpj: empresa.cnpj,
      stateRegistration: empresa.stateRegistration,
      address: empresa.address,
      email: empresa.email,
    });
    this.editing.set(true);
  }

  protected cancelar(): void {
    this.editing.set(false);
  }

  private async carregar(): Promise<void> {
    const usuario = this.session.usuario();
    if (!usuario || !usuario.companyId) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    try {
      const company = await firstValueFrom(this.companyService.getById(usuario.companyId));
      this.empresa.set(company);
    } catch (error) {
      this.logger.error('Falha ao carregar empresa', error);
      toast.error('Falha ao carregar dados da empresa.');
    } finally {
      this.loading.set(false);
    }
  }
}
