import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NgIcon } from '@ng-icons/core';

import type { ApiError, Company, CompanyConfig, UpdateCompanyConfigRequest, UpdateCompanyRequest } from '@/shared/models';
import { SessionService } from '@/shared/core/auth';
import { CompanyService } from '@/shared/services/company.service';
import { CompanyConfigService } from '@/shared/services/company-config.service';
import { LoggerService } from '@/shared/services/logger.service';
import { firstError } from '@/shared/utils/form-utils';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import {
  ZardFormDescriptionComponent,
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { ZardTooltipImports } from '@/shared/components/tooltip';

interface CompanyProfileModel {
  name: string;
  companyName: string;
  cnpj: string;
  stateRegistration: string;
  address: string;
  email: string;
}

interface RecognitionConfigModel {
  anprConfidenceThreshold: number;
  anprMatchTimeoutSeconds: number;
  anprConfirmationReads: number;
  anprStaleAfterSeconds: number;
  anprAutoRegisterCooldownSeconds: number;
  anprAutoRegister: boolean;
  anprSaveUnrecognizedPhotos: boolean;
  anprRecognitionMode: string;
  anprExternalProvider: string;
  anprExternalMinConfidence: number;
  anprExternalTimeoutMs: number;
  anprExternalFallbackToLocal: boolean;
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
    ZardFormDescriptionComponent,
    ZardFormControlComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
    ZardSelectImports,
    ZardSwitchComponent,
    ZardTooltipImports,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Minha empresa</h1>
        <p class="text-sm text-muted-foreground">Visualize e edite os dados e configurações da sua empresa.</p>
      </div>

      @if (loading()) {
        <z-card>
          <div class="py-10 text-center text-muted-foreground">Carregando dados da empresa...</div>
        </z-card>
      } @else if (empresa()) {
        <z-card>
          @if (!editing()) {
            <div class="flex flex-col gap-6 p-6">
              <!-- Dados da empresa -->
              <div class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-foreground">Dados da empresa</h2>

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
              </div>

              <hr class="border-border" />

              <!-- Reconhecimento -->
              <div class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-foreground">Reconhecimento de placas (ANPR)</h2>

                @if (loadingConfig()) {
                  <div class="py-6 text-center text-sm text-muted-foreground">Carregando configurações...</div>
                } @else if (config()) {
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Threshold de confiança</span>
                      <span class="text-sm text-foreground">{{ config()!.anprConfidenceThreshold }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Timeout de match (s)</span>
                      <span class="text-sm text-foreground">{{ config()!.anprMatchTimeoutSeconds }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Leituras para confirmação</span>
                      <span class="text-sm text-foreground">{{ config()!.anprConfirmationReads }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Stale after (s)</span>
                      <span class="text-sm text-foreground">{{ config()!.anprStaleAfterSeconds }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Cooldown auto-register (s)</span>
                      <span class="text-sm text-foreground">{{ config()!.anprAutoRegisterCooldownSeconds }}</span>
                    </div>
                    <div class="flex flex-col gap-1">
                      <span class="text-xs font-medium text-muted-foreground">Modo de reconhecimento</span>
                      <span class="text-sm text-foreground">{{ recognitionModeLabel(config()!.anprRecognitionMode) }}</span>
                    </div>
                    @if (config()!.anprRecognitionMode !== 'local') {
                      <div class="flex flex-col gap-1">
                        <span class="text-xs font-medium text-muted-foreground">Provider externo</span>
                        <span class="text-sm text-foreground">{{ config()!.anprExternalProvider === 'google_vision' ? 'Google Vision' : config()!.anprExternalProvider }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <span class="text-xs font-medium text-muted-foreground">Confiança externa mínima</span>
                        <span class="text-sm text-foreground">{{ config()!.anprExternalMinConfidence }}</span>
                      </div>
                      <div class="flex flex-col gap-1">
                        <span class="text-xs font-medium text-muted-foreground">Timeout externo (ms)</span>
                        <span class="text-sm text-foreground">{{ config()!.anprExternalTimeoutMs }}</span>
                      </div>
                    }
                  </div>

                  <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-foreground">Registro automático:</span>
                      <span class="text-sm font-medium" [class]="config()!.anprAutoRegister ? 'text-success-foreground' : 'text-muted-foreground'">
                        {{ config()!.anprAutoRegister ? 'Ativado' : 'Desativado' }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-foreground">Salvar fotos não reconhecidas:</span>
                      <span class="text-sm font-medium" [class]="config()!.anprSaveUnrecognizedPhotos ? 'text-success-foreground' : 'text-muted-foreground'">
                        {{ config()!.anprSaveUnrecognizedPhotos ? 'Ativado' : 'Desativado' }}
                      </span>
                    </div>
                    @if (config()!.anprRecognitionMode !== 'local') {
                      <div class="flex items-center gap-2">
                        <span class="text-sm text-foreground">Fallback local:</span>
                        <span class="text-sm font-medium" [class]="config()!.anprExternalFallbackToLocal ? 'text-success-foreground' : 'text-muted-foreground'">
                          {{ config()!.anprExternalFallbackToLocal ? 'Ativado' : 'Desativado' }}
                        </span>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="py-6 text-center text-sm text-muted-foreground">Configurações não encontradas.</div>
                }
              </div>

              <div class="flex items-center justify-end pt-2">
                <button z-button zType="default" zSize="sm" type="button" (click)="editar()">
                  <ng-icon name="lucidePencil" aria-hidden="true" />
                  Editar
                </button>
              </div>
            </div>
          } @else {
            <form [formRoot]="profileForm" class="flex flex-col gap-6 p-6" novalidate>
              <!-- Dados da empresa -->
              <div class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-foreground">Dados da empresa</h2>

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
              </div>

              <hr class="border-border" />

              <!-- Reconhecimento -->
              <div class="flex flex-col gap-4">
                <h2 class="text-sm font-semibold text-foreground">Reconhecimento de placas (ANPR)</h2>

                @if (loadingConfig()) {
                  <div class="py-6 text-center text-sm text-muted-foreground">Carregando configurações...</div>
                } @else if (config()) {
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-confidence">
                        Threshold de confiança
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Confiança mínima (0 a 1) que o OCR precisa atingir para aceitar uma leitura."
                          zTooltipPosition="right" />
                      </z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          id="rec-confidence"
                          type="number"
                          [zNumeric]="true"
                          [zMin]="0"
                          [zMax]="1"
                          [zStep]="0.05"
                          [formField]="recognitionForm.anprConfidenceThreshold"
                          placeholder="0.85"
                        />
                      </z-form-control>
                      <z-form-description>Valor entre 0 e 1. Padrão: 0.85.</z-form-description>
                      @if (recognitionForm.anprConfidenceThreshold().invalid() && recognitionForm.anprConfidenceThreshold().touched()) {
                        <z-form-message id="rec-confidence-error" [zError]="true">{{ getError(recognitionForm.anprConfidenceThreshold()) }}</z-form-message>
                      }
                    </z-form-field>

                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-match-timeout">
                        Timeout de match (s)
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Tempo máximo em segundos para correspondência de uma placa detectada."
                          zTooltipPosition="right" />
                      </z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          id="rec-match-timeout"
                          type="number"
                          [zNumeric]="true"
                          [zMin]="1"
                          [zMax]="60"
                          [formField]="recognitionForm.anprMatchTimeoutSeconds"
                          placeholder="5"
                        />
                      </z-form-control>
                      <z-form-description>Tempo para correlacionar leituras. Padrão: 5 s.</z-form-description>
                    </z-form-field>

                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-confirmation-reads">
                        Leituras para confirmação
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Número mínimo de leituras consistentes para confirmar o reconhecimento."
                          zTooltipPosition="right" />
                      </z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          id="rec-confirmation-reads"
                          type="number"
                          [zNumeric]="true"
                          [zMin]="1"
                          [zMax]="10"
                          [formField]="recognitionForm.anprConfirmationReads"
                          placeholder="2"
                        />
                      </z-form-control>
                      <z-form-description>Leituras idênticas para confirmar. Padrão: 2.</z-form-description>
                    </z-form-field>

                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-stale">
                        Stale after (s)
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Tempo após o qual uma observação parcial é descartada."
                          zTooltipPosition="left" />
                      </z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          id="rec-stale"
                          type="number"
                          [zNumeric]="true"
                          [zMin]="1"
                          [zMax]="60"
                          [formField]="recognitionForm.anprStaleAfterSeconds"
                          placeholder="5"
                        />
                      </z-form-control>
                      <z-form-description>Descarta observação parcial após este tempo. Padrão: 5 s.</z-form-description>
                    </z-form-field>

                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-cooldown">
                        Cooldown auto-register (s)
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Intervalo mínimo entre registros automáticos do mesmo veículo."
                          zTooltipPosition="right" />
                      </z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          id="rec-cooldown"
                          type="number"
                          [zNumeric]="true"
                          [zMin]="0"
                          [zMax]="3600"
                          [formField]="recognitionForm.anprAutoRegisterCooldownSeconds"
                          placeholder="30"
                        />
                      </z-form-control>
                      <z-form-description>Previne duplicatas. Padrão: 30 s.</z-form-description>
                    </z-form-field>

                    <z-form-field>
                      <z-form-label [zRequired]="true" for="rec-recognition-mode">
                        Modo de reconhecimento
                        <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                          zTooltip="Local usa apenas o OCR local. Verificado consulta uma API externa para validar a leitura local. Externo torna a API externa autoritativa."
                          zTooltipPosition="right" />
                      </z-form-label>
                      <z-form-control>
                        <z-select [formField]="recognitionForm.anprRecognitionMode" zPlaceholder="Selecione..." id="rec-recognition-mode">
                          <z-select-item zValue="local">Local (somente OCR local)</z-select-item>
                          <z-select-item zValue="verified">Verificado (local + API externa)</z-select-item>
                          <z-select-item zValue="external">Externo (API externa)</z-select-item>
                        </z-select>
                      </z-form-control>
                      <z-form-description>Padrão: Local.</z-form-description>
                      @if (recognitionForm.anprRecognitionMode().invalid() && recognitionForm.anprRecognitionMode().touched()) {
                        <z-form-message id="rec-recognition-mode-error" [zError]="true">{{ getError(recognitionForm.anprRecognitionMode()) }}</z-form-message>
                      }
                    </z-form-field>
                  </div>

                  @if (usaApiExterna()) {
                    <div class="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
                      <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">API externa de reconhecimento</h4>

                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <z-form-field>
                          <z-form-label [zRequired]="true" for="rec-external-provider">
                            Provider
                            <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                              zTooltip="Serviço externo usado para reconhecer a placa. As credenciais são configuradas no servidor."
                              zTooltipPosition="right" />
                          </z-form-label>
                          <z-form-control>
                            <z-select [formField]="recognitionForm.anprExternalProvider" zPlaceholder="Selecione..." id="rec-external-provider">
                              <z-select-item zValue="google_vision">Google Vision</z-select-item>
                            </z-select>
                          </z-form-control>
                          <z-form-description>Padrão: Google Vision.</z-form-description>
                        </z-form-field>

                        <z-form-field>
                          <z-form-label [zRequired]="true" for="rec-external-confidence">
                            Confiança mínima
                            <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                              zTooltip="Confiança mínima (0 a 1) para aceitar a placa retornada pela API externa."
                              zTooltipPosition="right" />
                          </z-form-label>
                          <z-form-control>
                            <input
                              z-input
                              id="rec-external-confidence"
                              type="number"
                              [zNumeric]="true"
                              [zMin]="0"
                              [zMax]="1"
                              [zStep]="0.05"
                              [formField]="recognitionForm.anprExternalMinConfidence"
                              placeholder="0.7"
                            />
                          </z-form-control>
                          <z-form-description>Valor entre 0 e 1. Padrão: 0.7.</z-form-description>
                          @if (recognitionForm.anprExternalMinConfidence().invalid() && recognitionForm.anprExternalMinConfidence().touched()) {
                            <z-form-message id="rec-external-confidence-error" [zError]="true">{{ getError(recognitionForm.anprExternalMinConfidence()) }}</z-form-message>
                          }
                        </z-form-field>

                        <z-form-field>
                          <z-form-label [zRequired]="true" for="rec-external-timeout">
                            Timeout (ms)
                            <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                              zTooltip="Tempo máximo em milissegundos aguardando a resposta da API externa."
                              zTooltipPosition="left" />
                          </z-form-label>
                          <z-form-control>
                            <input
                              z-input
                              id="rec-external-timeout"
                              type="number"
                              [zNumeric]="true"
                              [zMin]="100"
                              [zMax]="60000"
                              [zStep]="500"
                              [formField]="recognitionForm.anprExternalTimeoutMs"
                              placeholder="8000"
                            />
                          </z-form-control>
                          <z-form-description>Padrão: 8000 ms.</z-form-description>
                          @if (recognitionForm.anprExternalTimeoutMs().invalid() && recognitionForm.anprExternalTimeoutMs().touched()) {
                            <z-form-message id="rec-external-timeout-error" [zError]="true">{{ getError(recognitionForm.anprExternalTimeoutMs()) }}</z-form-message>
                          }
                        </z-form-field>
                      </div>

                      <z-form-field>
                        <z-form-control>
                          <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                            <z-switch [formField]="recognitionForm.anprExternalFallbackToLocal" />
                            Usar leitura local como fallback
                          </label>
                        </z-form-control>
                        <z-form-description>
                          Quando a API externa não retornar uma placa válida, usa o resultado do OCR local.
                        </z-form-description>
                      </z-form-field>
                    </div>
                  }

                  <div class="flex flex-col gap-3">
                    <z-form-field>
                      <z-form-control>
                        <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                          <z-switch [formField]="recognitionForm.anprAutoRegister" />
                          Registro automático de movimentação
                        </label>
                      </z-form-control>
                      <z-form-description>
                        Cria movimentos automaticamente ao detectar placas confirmadas pelas câmeras.
                      </z-form-description>
                    </z-form-field>

                    <z-form-field>
                      <z-form-control>
                        <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                          <z-switch [formField]="recognitionForm.anprSaveUnrecognizedPhotos" />
                          Salvar fotos de placas não reconhecidas
                        </label>
                      </z-form-control>
                      <z-form-description>
                        Salva foto capturada para validação visual pelo operador.
                      </z-form-description>
                    </z-form-field>
                  </div>
                } @else {
                  <div class="py-6 text-center text-sm text-muted-foreground">Configurações não encontradas.</div>
                }
              </div>

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
  private readonly configService = inject(CompanyConfigService);
  private readonly logger = inject(LoggerService).create('CompanyProfile');

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly editing = signal(false);
  protected readonly empresa = signal<Company | null>(null);

  protected readonly loadingConfig = signal(true);
  protected readonly config = signal<CompanyConfig | null>(null);

  private readonly model = signal<CompanyProfileModel>({
    name: '',
    companyName: '',
    cnpj: '',
    stateRegistration: '',
    address: '',
    email: '',
  });

  private readonly recognitionModel = signal<RecognitionConfigModel>({
    anprConfidenceThreshold: 0.85,
    anprMatchTimeoutSeconds: 5,
    anprConfirmationReads: 2,
    anprStaleAfterSeconds: 5,
    anprAutoRegisterCooldownSeconds: 30,
    anprAutoRegister: false,
    anprSaveUnrecognizedPhotos: true,
    anprRecognitionMode: 'local',
    anprExternalProvider: 'google_vision',
    anprExternalMinConfidence: 0.7,
    anprExternalTimeoutMs: 8000,
    anprExternalFallbackToLocal: true,
  });

  protected readonly usaApiExterna = computed(() => this.recognitionModel().anprRecognitionMode !== 'local');

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

          const companyPayload: UpdateCompanyRequest = {
            name: this.model().name,
            companyName: this.model().companyName,
            cnpj: this.model().cnpj,
            stateRegistration: this.model().stateRegistration,
            address: this.model().address,
            email: this.model().email,
          };

          const configPayload = this.buildConfigPayload();

          try {
            const promises: Promise<unknown>[] = [
              firstValueFrom(this.companyService.update(empresa.id, companyPayload)),
            ];

            if (configPayload) {
              promises.push(firstValueFrom(this.configService.update(empresa.id, configPayload)));
            }

            const results = await Promise.all(promises);
            this.empresa.set(results[0] as Company);

            if (configPayload && results[1]) {
              this.config.set(results[1] as CompanyConfig);
            }

            this.editing.set(false);
            this.logger.info('Empresa e configurações atualizadas', { companyId: empresa.id });
            toast.success('Salvo com sucesso.');
          } catch (error) {
            this.logger.error('Falha ao salvar', error);
            const message = (error as ApiError).message || 'Falha ao salvar.';
            toast.error(message);
          } finally {
            this.submitting.set(false);
          }
        },
      },
    },
  );

  protected readonly recognitionForm = form(
    this.recognitionModel,
    (fields) => {
      required(fields.anprConfidenceThreshold, { message: 'Informe o threshold de confiança.' });
      required(fields.anprMatchTimeoutSeconds, { message: 'Informe o timeout de match.' });
      required(fields.anprConfirmationReads, { message: 'Informe as leituras para confirmação.' });
      required(fields.anprStaleAfterSeconds, { message: 'Informe o stale after.' });
      required(fields.anprAutoRegisterCooldownSeconds, { message: 'Informe o cooldown.' });
      required(fields.anprRecognitionMode, { message: 'Selecione o modo de reconhecimento.' });
      required(fields.anprExternalProvider, { message: 'Selecione o provider externo.' });
      required(fields.anprExternalMinConfidence, { message: 'Informe a confiança mínima externa.' });
      required(fields.anprExternalTimeoutMs, { message: 'Informe o timeout externo.' });
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

  protected recognitionModeLabel(mode: string): string {
    switch (mode) {
      case 'verified':
        return 'Verificado (local + API externa)';
      case 'external':
        return 'Externo (API externa)';
      default:
        return 'Local (somente OCR local)';
    }
  }

  protected editar(): void {
    const empresa = this.empresa();
    const cfg = this.config();
    if (!empresa) return;

    this.model.set({
      name: empresa.name,
      companyName: empresa.companyName,
      cnpj: empresa.cnpj,
      stateRegistration: empresa.stateRegistration,
      address: empresa.address,
      email: empresa.email,
    });

    if (cfg) {
      this.recognitionModel.set({
        anprConfidenceThreshold: Number(cfg.anprConfidenceThreshold),
        anprMatchTimeoutSeconds: Number(cfg.anprMatchTimeoutSeconds),
        anprConfirmationReads: Number(cfg.anprConfirmationReads),
        anprStaleAfterSeconds: Number(cfg.anprStaleAfterSeconds),
        anprAutoRegisterCooldownSeconds: Number(cfg.anprAutoRegisterCooldownSeconds),
        anprAutoRegister: cfg.anprAutoRegister,
        anprSaveUnrecognizedPhotos: cfg.anprSaveUnrecognizedPhotos,
        anprRecognitionMode: cfg.anprRecognitionMode,
        anprExternalProvider: cfg.anprExternalProvider,
        anprExternalMinConfidence: Number(cfg.anprExternalMinConfidence),
        anprExternalTimeoutMs: Number(cfg.anprExternalTimeoutMs),
        anprExternalFallbackToLocal: cfg.anprExternalFallbackToLocal,
      });
    }

    this.editing.set(true);
  }

  protected cancelar(): void {
    this.editing.set(false);
  }

  private buildConfigPayload(): UpdateCompanyConfigRequest | null {
    const current = this.config();
    if (!current) return null;

    const m = this.recognitionModel();
    const payload: UpdateCompanyConfigRequest = {};

    if (m.anprConfidenceThreshold !== current.anprConfidenceThreshold) payload.anprConfidenceThreshold = m.anprConfidenceThreshold;
    if (m.anprMatchTimeoutSeconds !== current.anprMatchTimeoutSeconds) payload.anprMatchTimeoutSeconds = m.anprMatchTimeoutSeconds;
    if (m.anprConfirmationReads !== current.anprConfirmationReads) payload.anprConfirmationReads = m.anprConfirmationReads;
    if (m.anprStaleAfterSeconds !== current.anprStaleAfterSeconds) payload.anprStaleAfterSeconds = m.anprStaleAfterSeconds;
    if (m.anprAutoRegisterCooldownSeconds !== current.anprAutoRegisterCooldownSeconds) payload.anprAutoRegisterCooldownSeconds = m.anprAutoRegisterCooldownSeconds;
    if (m.anprAutoRegister !== current.anprAutoRegister) payload.anprAutoRegister = m.anprAutoRegister;
    if (m.anprSaveUnrecognizedPhotos !== current.anprSaveUnrecognizedPhotos) payload.anprSaveUnrecognizedPhotos = m.anprSaveUnrecognizedPhotos;
    if (m.anprRecognitionMode !== current.anprRecognitionMode) payload.anprRecognitionMode = m.anprRecognitionMode as 'local' | 'verified' | 'external';
    if (m.anprExternalProvider !== current.anprExternalProvider) payload.anprExternalProvider = m.anprExternalProvider as 'google_vision';
    if (m.anprExternalMinConfidence !== current.anprExternalMinConfidence) payload.anprExternalMinConfidence = m.anprExternalMinConfidence;
    if (m.anprExternalTimeoutMs !== current.anprExternalTimeoutMs) payload.anprExternalTimeoutMs = m.anprExternalTimeoutMs;
    if (m.anprExternalFallbackToLocal !== current.anprExternalFallbackToLocal) payload.anprExternalFallbackToLocal = m.anprExternalFallbackToLocal;

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private async carregar(): Promise<void> {
    const usuario = this.session.usuario();
    if (!usuario || !usuario.companyId) {
      this.loading.set(false);
      this.loadingConfig.set(false);
      return;
    }

    this.loading.set(true);
    this.loadingConfig.set(true);
    try {
      const [company, config] = await Promise.all([
        firstValueFrom(this.companyService.getById(usuario.companyId)),
        firstValueFrom(this.configService.get(usuario.companyId)),
      ]);
      this.empresa.set(company);
      this.config.set(config);
    } catch (error) {
      this.logger.error('Falha ao carregar dados', error);
      toast.error('Falha ao carregar dados da empresa.');
    } finally {
      this.loading.set(false);
      this.loadingConfig.set(false);
    }
  }
}
