import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { NgIcon } from '@ng-icons/core';

import type { ApiError, CompanyConfig, UpdateCompanyConfigRequest } from '@/shared/models';
import { CompanyConfigService } from '@/shared/services/company-config.service';
import { LoggerService } from '@/shared/services/logger.service';
import { firstError } from '@/shared/utils/form-utils';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
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

interface ConfigFormModel {
  timezone: string;
  language: string;
  cameraDefaultProtocol: string;
  cameraDefaultPort: number;
  cameraDefaultAuthType: string;
  cameraSnapshotIntervalMs: number;
  anprConfidenceThreshold: number;
  anprMatchTimeoutSeconds: number;
  anprConfirmationReads: number;
  anprStaleAfterSeconds: number;
  anprAutoRegister: boolean;
  anprSaveUnrecognizedPhotos: boolean;
  anprAutoRegisterCooldownSeconds: number;
  anprRecognitionMode: string;
  anprExternalProvider: string;
  anprExternalMinConfidence: number;
  anprExternalTimeoutMs: number;
  anprExternalFallbackToLocal: boolean;
  movementAutoCloseMinutes: number;
  requireDriverName: boolean;
  requirePurpose: boolean;
}

export interface ConfigDialogData {
  companyId: string;
  config: CompanyConfig;
}

@Component({
  selector: 'app-company-config-dialog',
  imports: [
    FormRoot,
    FormField,
    NgIcon,
    ZardButtonComponent,
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
    <form [formRoot]="configForm" class="flex flex-col gap-5" novalidate>
      <!-- Geral -->
      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-foreground">Geral</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-timezone">
              Fuso horário
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Define o fuso horário utilizado para timestamps de movimentações e relatórios."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <z-select [formField]="configForm.timezone" zPlaceholder="Selecione..." id="cfg-timezone">
                <z-select-item zValue="America/Sao_Paulo">América/São Paulo</z-select-item>
                <z-select-item zValue="America/Manaus">América/Manaus</z-select-item>
                <z-select-item zValue="America/Belem">América/Belém</z-select-item>
                <z-select-item zValue="America/Fortaleza">América/Fortaleza</z-select-item>
                <z-select-item zValue="America/Recife">América/Recife</z-select-item>
                <z-select-item zValue="America/Bahia">América/Bahia</z-select-item>
                <z-select-item zValue="America/Goiania">América/Goiânia</z-select-item>
                <z-select-item zValue="America/Cuiaba">América/Cuiabá</z-select-item>
                <z-select-item zValue="America/Campo_Grande">América/Campo Grande</z-select-item>
                <z-select-item zValue="America/Porto_Velho">América/Porto Velho</z-select-item>
                <z-select-item zValue="America/Boa_Vista">América/Boa Vista</z-select-item>
                <z-select-item zValue="America/Rio_Branco">América/Rio Branco</z-select-item>
              </z-select>
            </z-form-control>
            <z-form-description>Padrão: America/Sao_Paulo.</z-form-description>
            @if (configForm.timezone().invalid() && configForm.timezone().touched()) {
              <z-form-message id="cfg-timezone-error" [zError]="true">{{ getError(configForm.timezone()) }}</z-form-message>
            }
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-language">
              Idioma
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Idioma padrão exibido na interface do sistema para esta empresa."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <z-select [formField]="configForm.language" zPlaceholder="Selecione..." id="cfg-language">
                <z-select-item zValue="pt-BR">Português (Brasil)</z-select-item>
                <z-select-item zValue="en-US">English (US)</z-select-item>
                <z-select-item zValue="es">Español</z-select-item>
              </z-select>
            </z-form-control>
            <z-form-description>Padrão: pt-BR.</z-form-description>
            @if (configForm.language().invalid() && configForm.language().touched()) {
              <z-form-message id="cfg-language-error" [zError]="true">{{ getError(configForm.language()) }}</z-form-message>
            }
          </z-form-field>
        </div>
      </section>

      <hr class="border-border" />

      <!-- Câmeras -->
      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-foreground">Câmeras</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-protocol">
              Protocolo padrão
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Protocolo de rede usado para se comunicar com as câmeras IP. Use HTTP se a câmera não suporta TLS."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <z-select [formField]="configForm.cameraDefaultProtocol" zPlaceholder="Selecione..." id="cfg-protocol">
                <z-select-item zValue="http">HTTP</z-select-item>
                <z-select-item zValue="https">HTTPS</z-select-item>
              </z-select>
            </z-form-control>
            <z-form-description>Protocolo de comunicação com as câmeras. Padrão: HTTP.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-auth-type">
              Autenticação padrão
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Digest é mais seguro (não envia senha em texto plano). Basic requer HTTPS para ser seguro."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <z-select [formField]="configForm.cameraDefaultAuthType" zPlaceholder="Selecione..." id="cfg-auth-type">
                <z-select-item zValue="digest">Digest</z-select-item>
                <z-select-item zValue="basic">Basic</z-select-item>
              </z-select>
            </z-form-control>
            <z-form-description>Recomenda-se Digest para mayor segurança. Padrão: Digest.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-port">
              Porta padrão
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Porta de rede usada pela câmera para streaming. HTTP costuma ser 80, HTTPS 443, RTSP 554."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-port"
                type="number"
                [zNumeric]="true"
                [zMin]="1"
                [zMax]="65535"
                [formField]="configForm.cameraDefaultPort"
                placeholder="80"
              />
            </z-form-control>
            <z-form-description>Porta TCP usada pelas câmeras. Padrão: 80.</z-form-description>
            @if (configForm.cameraDefaultPort().invalid() && configForm.cameraDefaultPort().touched()) {
              <z-form-message id="cfg-port-error" [zError]="true">{{ getError(configForm.cameraDefaultPort()) }}</z-form-message>
            }
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-snapshot-interval">
              Intervalo de snapshot (ms)
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Frequência com que cada câmera captura imagem para o ANPR. Valores menores aumentam precisão mas consomem mais CPU/rede."
                zTooltipPosition="left" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-snapshot-interval"
                type="number"
                [zNumeric]="true"
                [zMin]="100"
                [zMax]="60000"
                [zStep]="100"
                [formField]="configForm.cameraSnapshotIntervalMs"
                placeholder="1000"
              />
            </z-form-control>
            <z-form-description>Intervalo entre capturas de imagem. Padrão: 1000 ms.</z-form-description>
            @if (configForm.cameraSnapshotIntervalMs().invalid() && configForm.cameraSnapshotIntervalMs().touched()) {
              <z-form-message id="cfg-snapshot-error" [zError]="true">{{ getError(configForm.cameraSnapshotIntervalMs()) }}</z-form-message>
            }
          </z-form-field>
        </div>
      </section>

      <hr class="border-border" />

      <!-- ANPR -->
      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-foreground">ANPR — Reconhecimento de placas</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-confidence">
              Threshold de confiança
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Confiança mínima (0 a 1) que o OCR precisa atingir para aceitar uma leitura. Valores altos reduzem falsos positivos mas podem ignorar placas legíveis."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-confidence"
                type="number"
                [zNumeric]="true"
                [zMin]="0"
                [zMax]="1"
                [zStep]="0.05"
                [formField]="configForm.anprConfidenceThreshold"
                placeholder="0.85"
              />
            </z-form-control>
            <z-form-description>Valor entre 0 e 1. Padrão: 0.85.</z-form-description>
            @if (configForm.anprConfidenceThreshold().invalid() && configForm.anprConfidenceThreshold().touched()) {
              <z-form-message id="cfg-confidence-error" [zError]="true">{{ getError(configForm.anprConfidenceThreshold()) }}</z-form-message>
            }
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-match-timeout">
              Timeout de match (s)
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Tempo máximo em segundos que o sistema aguarda para correspondência de uma placa detectada com outra leitura anterior."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-match-timeout"
                type="number"
                [zNumeric]="true"
                [zMin]="1"
                [zMax]="60"
                [formField]="configForm.anprMatchTimeoutSeconds"
                placeholder="5"
              />
            </z-form-control>
            <z-form-description>Tempo para correlacionar leituras da mesma placa. Padrão: 5 s.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-confirmation-reads">
              Leituras para confirmação
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Número mínimo de leituras consistentes da mesma placa para confirmar o reconhecimento. Mais leituras = maior confiabilidade."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-confirmation-reads"
                type="number"
                [zNumeric]="true"
                [zMin]="1"
                [zMax]="10"
                [formField]="configForm.anprConfirmationReads"
                placeholder="2"
              />
            </z-form-control>
            <z-form-description>Quantas leituras idênticas confirmam a placa. Padrão: 2.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-stale">
              Stale after (s)
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Tempo após o qual uma observação de placa parcial é descartada por falta de novas leituras."
                zTooltipPosition="left" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-stale"
                type="number"
                [zNumeric]="true"
                [zMin]="1"
                [zMax]="60"
                [formField]="configForm.anprStaleAfterSeconds"
                placeholder="5"
              />
            </z-form-control>
            <z-form-description>Descarta observação parcial após este tempo. Padrão: 5 s.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-cooldown">
              Cooldown auto-register (s)
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Intervalo mínimo entre registros automáticos do mesmo veículo no mesmo ponto. Evita registros duplicados quando o veículo passa lentamente."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-cooldown"
                type="number"
                [zNumeric]="true"
                [zMin]="0"
                [zMax]="3600"
                [formField]="configForm.anprAutoRegisterCooldownSeconds"
                placeholder="30"
              />
            </z-form-control>
            <z-form-description>Previne duplicatas do mesmo veículo. Padrão: 30 s.</z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-recognition-mode">
              Modo de reconhecimento
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Local usa apenas o OCR local. Verificado consulta uma API externa para validar a leitura local (a placa externa vence quando válida). Externo torna a API externa autoritativa."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <z-select [formField]="configForm.anprRecognitionMode" zPlaceholder="Selecione..." id="cfg-recognition-mode">
                <z-select-item zValue="local">Local (somente OCR local)</z-select-item>
                <z-select-item zValue="verified">Verificado (local + API externa)</z-select-item>
                <z-select-item zValue="external">Externo (API externa)</z-select-item>
              </z-select>
            </z-form-control>
            <z-form-description>Padrão: Local.</z-form-description>
            @if (configForm.anprRecognitionMode().invalid() && configForm.anprRecognitionMode().touched()) {
              <z-form-message id="cfg-recognition-mode-error" [zError]="true">{{ getError(configForm.anprRecognitionMode()) }}</z-form-message>
            }
          </z-form-field>
        </div>

        @if (usaApiExterna()) {
          <div class="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">API externa de reconhecimento</h4>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <z-form-field>
                <z-form-label [zRequired]="true" for="cfg-external-provider">
                  Provider
                  <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                    zTooltip="Serviço externo usado para reconhecer a placa. As credenciais são configuradas no servidor via variáveis de ambiente."
                    zTooltipPosition="right" />
                </z-form-label>
                <z-form-control>
                  <z-select [formField]="configForm.anprExternalProvider" zPlaceholder="Selecione..." id="cfg-external-provider">
                    <z-select-item zValue="google_vision">Google Vision</z-select-item>
                  </z-select>
                </z-form-control>
                <z-form-description>Padrão: Google Vision.</z-form-description>
              </z-form-field>

              <z-form-field>
                <z-form-label [zRequired]="true" for="cfg-external-confidence">
                  Confiança mínima
                  <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                    zTooltip="Confiança mínima (0 a 1) para aceitar a placa retornada pela API externa."
                    zTooltipPosition="right" />
                </z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="cfg-external-confidence"
                    type="number"
                    [zNumeric]="true"
                    [zMin]="0"
                    [zMax]="1"
                    [zStep]="0.05"
                    [formField]="configForm.anprExternalMinConfidence"
                    placeholder="0.7"
                  />
                </z-form-control>
                <z-form-description>Valor entre 0 e 1. Padrão: 0.7.</z-form-description>
                @if (configForm.anprExternalMinConfidence().invalid() && configForm.anprExternalMinConfidence().touched()) {
                  <z-form-message id="cfg-external-confidence-error" [zError]="true">{{ getError(configForm.anprExternalMinConfidence()) }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <z-form-label [zRequired]="true" for="cfg-external-timeout">
                  Timeout (ms)
                  <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                    zTooltip="Tempo máximo em milissegundos aguardando a resposta da API externa."
                    zTooltipPosition="left" />
                </z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="cfg-external-timeout"
                    type="number"
                    [zNumeric]="true"
                    [zMin]="100"
                    [zMax]="60000"
                    [zStep]="500"
                    [formField]="configForm.anprExternalTimeoutMs"
                    placeholder="8000"
                  />
                </z-form-control>
                <z-form-description>Padrão: 8000 ms.</z-form-description>
                @if (configForm.anprExternalTimeoutMs().invalid() && configForm.anprExternalTimeoutMs().touched()) {
                  <z-form-message id="cfg-external-timeout-error" [zError]="true">{{ getError(configForm.anprExternalTimeoutMs()) }}</z-form-message>
                }
              </z-form-field>
            </div>

            <z-form-field>
              <z-form-control>
                <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                  <z-switch [formField]="configForm.anprExternalFallbackToLocal" />
                  Usar leitura local como fallback
                </label>
              </z-form-control>
              <z-form-description>
                Quando a API externa não retornar uma placa válida, usa o resultado do OCR local. Desative para
                descartar a leitura nesses casos.
              </z-form-description>
            </z-form-field>
          </div>
        }

        <div class="flex flex-col gap-3 mt-1">
          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                <z-switch [formField]="configForm.anprAutoRegister" />
                Registro automático de movimentação
              </label>
            </z-form-control>
            <z-form-description>
              Quando ativado, o sistema cria movimentos de entrada/saída automaticamente ao detectar placas confirmadas
              pelas câmeras, sem intervenção do porteiro. Placas não reconhecidas ficam com status
              <span class="font-medium">pending_review</span> para validação manual.
            </z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                <z-switch [formField]="configForm.anprSaveUnrecognizedPhotos" />
                Salvar fotos de placas não reconhecidas
              </label>
            </z-form-control>
            <z-form-description>
              Ao detectar uma placa que não está na base de dados, a foto capturada fica salva no campo
              <span class="font-medium">photoPath</span> do movimento
              <span class="font-medium">pending_review</span>, permitindo validação visual pelo operador.
            </z-form-description>
          </z-form-field>
        </div>
      </section>

      <hr class="border-border" />

      <!-- Movimentação -->
      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-foreground">Movimentação</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <z-form-field>
            <z-form-label [zRequired]="true" for="cfg-auto-close">
              Auto-fechar movimento (min)
              <ng-icon name="lucideCircleHelp" class="ml-1 inline-block size-3.5 text-muted-foreground"
                zTooltip="Tempo em minutos após o qual um movimento de entrada aberto é automaticamente fechado pelo sistema."
                zTooltipPosition="right" />
            </z-form-label>
            <z-form-control>
              <input
                z-input
                id="cfg-auto-close"
                type="number"
                [zNumeric]="true"
                [zMin]="1"
                [zMax]="1440"
                [formField]="configForm.movementAutoCloseMinutes"
                placeholder="60"
              />
            </z-form-control>
            <z-form-description>Minutos para auto-fechar movimentos abertos. Padrão: 60 min.</z-form-description>
          </z-form-field>
        </div>

        <div class="flex flex-col gap-3 mt-1">
          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                <z-switch [formField]="configForm.requireDriverName" />
                Exigir nome do motorista
              </label>
            </z-form-control>
            <z-form-description>
              Quando ativado, o campo <span class="font-medium">nome do motorista</span> se torna obrigatório no
              formulário de movimentação.
            </z-form-description>
          </z-form-field>

          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-3 text-sm font-medium leading-none cursor-pointer">
                <z-switch [formField]="configForm.requirePurpose" />
                Exigir motivo da movimentação
              </label>
            </z-form-control>
            <z-form-description>
              Quando ativado, o campo <span class="font-medium">motivo</span> se torna obrigatório no
              formulário de movimentação.
            </z-form-description>
          </z-form-field>
        </div>
      </section>

      <!-- Ações -->
      <div class="flex items-center justify-end gap-2 pt-2">
        <button z-button zType="ghost" zSize="default" type="button" (click)="cancelar()">Cancelar</button>
        <button
          z-button
          zType="default"
          zSize="default"
          type="submit"
          [zLoading]="submitting()"
          [zDisabled]="configForm().invalid()"
        >
          Salvar configurações
        </button>
      </div>
    </form>
  `,
})
export class CompanyConfigDialog {
  private readonly dialogRef = inject(ZardDialogRef<CompanyConfigDialog, CompanyConfig>);
  private readonly data = inject<ConfigDialogData>(Z_MODAL_DATA);
  private readonly configService = inject(CompanyConfigService);
  private readonly logger = inject(LoggerService).create('CompanyConfigDialog');

  protected readonly submitting = signal(false);

  private readonly timezoneInput = viewChild<ElementRef<HTMLInputElement>>('timezoneInput');

  private readonly model = signal<ConfigFormModel>({
    timezone: this.data.config.timezone,
    language: this.data.config.language,
    cameraDefaultProtocol: this.data.config.cameraDefaultProtocol,
    cameraDefaultPort: Number(this.data.config.cameraDefaultPort),
    cameraDefaultAuthType: this.data.config.cameraDefaultAuthType,
    cameraSnapshotIntervalMs: Number(this.data.config.cameraSnapshotIntervalMs),
    anprConfidenceThreshold: Number(this.data.config.anprConfidenceThreshold),
    anprMatchTimeoutSeconds: Number(this.data.config.anprMatchTimeoutSeconds),
    anprConfirmationReads: Number(this.data.config.anprConfirmationReads),
    anprStaleAfterSeconds: Number(this.data.config.anprStaleAfterSeconds),
    anprAutoRegister: this.data.config.anprAutoRegister,
    anprSaveUnrecognizedPhotos: this.data.config.anprSaveUnrecognizedPhotos,
    anprAutoRegisterCooldownSeconds: Number(this.data.config.anprAutoRegisterCooldownSeconds),
    anprRecognitionMode: this.data.config.anprRecognitionMode,
    anprExternalProvider: this.data.config.anprExternalProvider,
    anprExternalMinConfidence: Number(this.data.config.anprExternalMinConfidence),
    anprExternalTimeoutMs: Number(this.data.config.anprExternalTimeoutMs),
    anprExternalFallbackToLocal: this.data.config.anprExternalFallbackToLocal,
    movementAutoCloseMinutes: Number(this.data.config.movementAutoCloseMinutes),
    requireDriverName: this.data.config.requireDriverName,
    requirePurpose: this.data.config.requirePurpose,
  });

  protected readonly usaApiExterna = computed(() => this.model().anprRecognitionMode !== 'local');

  protected readonly configForm = form(
    this.model,
    (fields) => {
      required(fields.timezone, { message: 'Informe o fuso horário.' });
      required(fields.language, { message: 'Informe o idioma.' });
      required(fields.cameraDefaultProtocol, { message: 'Selecione o protocolo.' });
      required(fields.cameraDefaultPort, { message: 'Informe a porta.' });
      required(fields.cameraDefaultAuthType, { message: 'Selecione o tipo de autenticação.' });
      required(fields.cameraSnapshotIntervalMs, { message: 'Informe o intervalo de snapshot.' });
      required(fields.anprConfidenceThreshold, { message: 'Informe o threshold de confiança.' });
      required(fields.anprMatchTimeoutSeconds, { message: 'Informe o timeout de match.' });
      required(fields.anprConfirmationReads, { message: 'Informe as leituras para confirmação.' });
      required(fields.anprStaleAfterSeconds, { message: 'Informe o stale after.' });
      required(fields.anprAutoRegisterCooldownSeconds, { message: 'Informe o cooldown.' });
      required(fields.anprRecognitionMode, { message: 'Selecione o modo de reconhecimento.' });
      required(fields.anprExternalProvider, { message: 'Selecione o provider externo.' });
      required(fields.anprExternalMinConfidence, { message: 'Informe a confiança mínima externa.' });
      required(fields.anprExternalTimeoutMs, { message: 'Informe o timeout externo.' });
      required(fields.movementAutoCloseMinutes, { message: 'Informe o auto-close.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          try {
            const payload = this.buildPayload();
            const updated = await firstValueFrom(
              this.configService.update(this.data.companyId, payload),
            );
            this.logger.info('Configuração salva', { companyId: this.data.companyId });
            toast.success('Configurações salvas com sucesso.');
            this.dialogRef.close(updated);
          } catch (error) {
            this.logger.error('Falha ao salvar configuração', error);
            const message = (error as ApiError).message || 'Falha ao salvar configurações.';
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
      this.timezoneInput()?.nativeElement?.focus();
    });
  }

  protected getError<V>(field: FieldState<V, string>): string {
    return firstError(field);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  private buildPayload(): UpdateCompanyConfigRequest {
    const m = this.model();
    const original = this.data.config;

    const payload: UpdateCompanyConfigRequest = {};

    if (m.timezone !== original.timezone) payload.timezone = m.timezone;
    if (m.language !== original.language) payload.language = m.language;
    if (m.cameraDefaultProtocol !== original.cameraDefaultProtocol) payload.cameraDefaultProtocol = m.cameraDefaultProtocol as 'http' | 'https';
    if (m.cameraDefaultPort !== original.cameraDefaultPort) payload.cameraDefaultPort = m.cameraDefaultPort;
    if (m.cameraDefaultAuthType !== original.cameraDefaultAuthType) payload.cameraDefaultAuthType = m.cameraDefaultAuthType as 'digest' | 'basic';
    if (m.cameraSnapshotIntervalMs !== original.cameraSnapshotIntervalMs) payload.cameraSnapshotIntervalMs = m.cameraSnapshotIntervalMs;
    if (m.anprConfidenceThreshold !== original.anprConfidenceThreshold) payload.anprConfidenceThreshold = m.anprConfidenceThreshold;
    if (m.anprMatchTimeoutSeconds !== original.anprMatchTimeoutSeconds) payload.anprMatchTimeoutSeconds = m.anprMatchTimeoutSeconds;
    if (m.anprConfirmationReads !== original.anprConfirmationReads) payload.anprConfirmationReads = m.anprConfirmationReads;
    if (m.anprStaleAfterSeconds !== original.anprStaleAfterSeconds) payload.anprStaleAfterSeconds = m.anprStaleAfterSeconds;
    if (m.anprAutoRegister !== original.anprAutoRegister) payload.anprAutoRegister = m.anprAutoRegister;
    if (m.anprSaveUnrecognizedPhotos !== original.anprSaveUnrecognizedPhotos) payload.anprSaveUnrecognizedPhotos = m.anprSaveUnrecognizedPhotos;
    if (m.anprAutoRegisterCooldownSeconds !== original.anprAutoRegisterCooldownSeconds) payload.anprAutoRegisterCooldownSeconds = m.anprAutoRegisterCooldownSeconds;
    if (m.anprRecognitionMode !== original.anprRecognitionMode) payload.anprRecognitionMode = m.anprRecognitionMode as 'local' | 'verified' | 'external';
    if (m.anprExternalProvider !== original.anprExternalProvider) payload.anprExternalProvider = m.anprExternalProvider as 'google_vision';
    if (m.anprExternalMinConfidence !== original.anprExternalMinConfidence) payload.anprExternalMinConfidence = m.anprExternalMinConfidence;
    if (m.anprExternalTimeoutMs !== original.anprExternalTimeoutMs) payload.anprExternalTimeoutMs = m.anprExternalTimeoutMs;
    if (m.anprExternalFallbackToLocal !== original.anprExternalFallbackToLocal) payload.anprExternalFallbackToLocal = m.anprExternalFallbackToLocal;
    if (m.movementAutoCloseMinutes !== original.movementAutoCloseMinutes) payload.movementAutoCloseMinutes = m.movementAutoCloseMinutes;
    if (m.requireDriverName !== original.requireDriverName) payload.requireDriverName = m.requireDriverName;
    if (m.requirePurpose !== original.requirePurpose) payload.requirePurpose = m.requirePurpose;

    return payload;
  }
}
