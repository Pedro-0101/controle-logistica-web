import { afterNextRender, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

import type {
  AdminUnity,
  ApiError,
  CreatePointRequest,
  Point,
  PointAnprConfig,
  PointType,
  UpdatePointRequest,
} from '@/shared/models';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { PointService } from '@/shared/services/point.service';
import { LoggerService } from '@/shared/services/logger.service';
import { firstError } from '@/shared/utils/form-utils';
import { createStepNavigation } from '@/shared/utils/step-navigation';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardFormStepperComponent } from '@/shared/components/form/stepper.component';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardBadgeComponent } from '@/shared/components/badge';

interface PointFormModel {
  name: string;
  code: string;
  type: PointType;
  adminUnityId: string;
  active: boolean;
  anprAutoRegister: boolean;
  anprSaveUnrecognizedPhotos: boolean;
  anprAutoRegisterCooldownSeconds: number | null;
  anprConfidenceThreshold: number | null;
  anprMatchTimeoutSeconds: number | null;
  anprConfirmationReads: number | null;
  anprStaleAfterSeconds: number | null;
  anprRecognitionMode: string;
  anprExternalProvider: string;
  anprExternalMinConfidence: number | null;
  anprExternalTimeoutMs: number | null;
  anprExternalFallbackToLocal: boolean;
}

const POINT_TYPE_OPTIONS: { value: PointType; label: string }[] = [
  { value: 'entry', label: 'Entrada' },
  { value: 'exit', label: 'Saída' },
  { value: 'both', label: 'Entrada/Saída' },
];

const STEP_LABELS = ['Identificação', 'Configuração', 'Registro Automático'];

@Component({
  selector: 'app-point-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardFormStepperComponent,
    ZardInputDirective,
    ZardBadgeComponent,
  ],
  template: `
    <z-form-stepper
      [steps]="stepLabels"
      [currentStep]="nav.currentStep()"
      [zLinear]="true"
      (stepChange)="nav.goToStep($event)"
    />

    <form [formRoot]="pointForm" class="flex flex-col gap-5" novalidate>
      @if (nav.currentStep() === 0) {
        <div class="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p class="text-sm text-muted-foreground">
            Nome e código para identificação do ponto.
          </p>

          <div class="grid grid-cols-2 gap-5">
            <z-form-field>
              <z-form-label [zRequired]="true" for="point-name">Nome</z-form-label>
              <z-form-control>
                <input
                  z-input
                  zSize="lg"
                  #nameInput
                  id="point-name"
                  type="text"
                  [formField]="pointForm.name"
                  autocomplete="off"
                  placeholder="Portão Principal"
                  [attr.aria-invalid]="pointForm.name().invalid() && pointForm.name().touched()"
                />
              </z-form-control>
              @if (pointForm.name().invalid() && pointForm.name().touched()) {
                <z-form-message [zError]="true">{{ getError(pointForm.name()) }}</z-form-message>
              }
            </z-form-field>

            <z-form-field>
              <z-form-label [zRequired]="true" for="point-code">Código</z-form-label>
              <z-form-control>
                <input
                  z-input
                  zSize="lg"
                  id="point-code"
                  type="text"
                  [formField]="pointForm.code"
                  autocomplete="off"
                  placeholder="P-001"
                  [attr.aria-invalid]="pointForm.code().invalid() && pointForm.code().touched()"
                />
              </z-form-control>
              @if (pointForm.code().invalid() && pointForm.code().touched()) {
                <z-form-message [zError]="true">{{ getError(pointForm.code()) }}</z-form-message>
              }
            </z-form-field>
          </div>
        </div>
      }

      @if (nav.currentStep() === 1) {
        <div class="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p class="text-sm text-muted-foreground">
            Classificação e vinculação administrativa do ponto.
          </p>

          <div class="grid grid-cols-2 gap-5">
            <z-form-field>
              <z-form-label [zRequired]="true" for="point-type">Tipo</z-form-label>
              <z-form-control>
                <select z-input zSize="lg" id="point-type" [formField]="pointForm.type">
                  @for (option of pointTypeOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </z-form-control>
            </z-form-field>

            <z-form-field>
              <z-form-label [zRequired]="true" for="point-admin-unity">Unidade Administrativa</z-form-label>
              <z-form-control>
                <select z-input zSize="lg" id="point-admin-unity" [formField]="pointForm.adminUnityId">
                  <option value="" disabled>Selecione</option>
                  @for (unit of adminUnities(); track unit.id) {
                    <option [value]="unit.id">{{ unit.name }}</option>
                  }
                </select>
              </z-form-control>
              @if (pointForm.adminUnityId().invalid() && pointForm.adminUnityId().touched()) {
                <z-form-message [zError]="true">{{ getError(pointForm.adminUnityId()) }}</z-form-message>
              }
            </z-form-field>
          </div>

          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-2 text-sm font-medium leading-none">
                <z-checkbox [formField]="pointForm.active" />
                Ponto ativo
              </label>
            </z-form-control>
            <p class="text-xs text-muted-foreground mt-1 ml-6">
              Pontos inativos não recebem monitoramento nem registros.
            </p>
          </z-form-field>
        </div>
      }

      @if (nav.currentStep() === 2) {
        <div class="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium">Registro Automático (ANPR)</h3>
            @if (pointForm.anprAutoRegister()) {
              <z-badge [zType]="anprInherit() ? 'secondary' : 'default'" zShape="pill">
                {{ anprInherit() ? 'Herdado' : 'Customizado' }}
              </z-badge>
            }
          </div>

          <div class="rounded-lg border border-dashed p-4 bg-muted/30">
            <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Como funciona</h4>
            <ol class="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>A câmera ANPR captura a imagem do veículo</li>
              <li>O sistema reconhece a placa (OCR) e extrai o texto</li>
              <li>Com base nas configurações, valida e confirma a leitura</li>
              <li>Se confirmado, <strong>cria automaticamente um registro de movimentação</strong> (entrada ou saída)</li>
            </ol>
          </div>

          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-2 text-sm font-medium leading-none">
                <z-checkbox [formField]="pointForm.anprAutoRegister" />
                Habilitar registro automático
              </label>
            </z-form-control>
            <p class="text-xs text-muted-foreground mt-1 ml-6">
              Quando habilitado, o sistema reconhece placas via câmeras e cria movimentações
              automaticamente. Quando desabilitado, as leituras são apenas visualizadas.
            </p>
          </z-form-field>

          @if (pointForm.anprAutoRegister()) {
            <z-form-field>
              <z-form-control>
                <label class="flex items-center gap-2 text-sm font-medium leading-none">
                  <z-checkbox [checked]="anprInherit()" (checkedChange)="onAnprInheritChange($event)" />
                  Usar configurações da empresa
                </label>
              </z-form-control>
              <p class="text-xs text-muted-foreground mt-1 ml-6">
                Desative para configurar parâmetros individualmente para este ponto.
              </p>
            </z-form-field>

            @if (!anprInherit()) {
              <z-form-field>
                <z-form-control>
                  <label class="flex items-center gap-2 text-sm font-medium leading-none">
                    <z-checkbox [formField]="pointForm.anprSaveUnrecognizedPhotos" />
                    Salvar fotos não reconhecidas
                  </label>
                </z-form-control>
                <p class="text-xs text-muted-foreground mt-1 ml-6">
                  Armazena imagem quando a placa não é reconhecida.
                </p>
              </z-form-field>

              <div class="grid grid-cols-2 gap-5">
                <z-form-field>
                  <z-form-label for="anpr-cooldown">Cooldown (segundos)</z-form-label>
                  <z-form-control>
                    <input
                      z-input
                      zSize="lg"
                      id="anpr-cooldown"
                      type="number"
                      [formField]="pointForm.anprAutoRegisterCooldownSeconds"
                      [zNumeric]="true"
                      [zMin]="0"
                      placeholder="30"
                    />
                  </z-form-control>
                  <p class="text-xs text-muted-foreground mt-1">
                    Intervalo mínimo entre registros do mesmo veículo.
                  </p>
                </z-form-field>

                <z-form-field>
                  <z-form-label for="anpr-confidence">Confiança mínima</z-form-label>
                  <z-form-control>
                    <input
                      z-input
                      zSize="lg"
                      id="anpr-confidence"
                      type="number"
                      [formField]="pointForm.anprConfidenceThreshold"
                      [zNumeric]="true"
                      [zMin]="0"
                      [zMax]="1"
                      [zStep]="0.05"
                      placeholder="0.85"
                    />
                  </z-form-control>
                  <p class="text-xs text-muted-foreground mt-1">
                    Nível mínimo do OCR (0–1). Recomendado: 0.85.
                  </p>
                </z-form-field>
              </div>

              <div class="grid grid-cols-2 gap-5">
                <z-form-field>
                  <z-form-label for="anpr-timeout">Timeout confirmação (seg)</z-form-label>
                  <z-form-control>
                    <input
                      z-input
                      zSize="lg"
                      id="anpr-timeout"
                      type="number"
                      [formField]="pointForm.anprMatchTimeoutSeconds"
                      [zNumeric]="true"
                      [zMin]="1"
                      placeholder="5"
                    />
                  </z-form-control>
                  <p class="text-xs text-muted-foreground mt-1">
                    Tempo máximo para confirmar leitura.
                  </p>
                </z-form-field>

                <z-form-field>
                  <z-form-label for="anpr-reads">Leituras p/ confirmação</z-form-label>
                  <z-form-control>
                    <input
                      z-input
                      zSize="lg"
                      id="anpr-reads"
                      type="number"
                      [formField]="pointForm.anprConfirmationReads"
                      [zNumeric]="true"
                      [zMin]="1"
                      placeholder="2"
                    />
                  </z-form-control>
                  <p class="text-xs text-muted-foreground mt-1">
                    Leituras consecutivas da mesma placa. Recomendado: 2.
                  </p>
                </z-form-field>
              </div>

              <z-form-field>
                <z-form-label for="anpr-stale">Expirar observação (segundos)</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    zSize="lg"
                    id="anpr-stale"
                    type="number"
                    [formField]="pointForm.anprStaleAfterSeconds"
                    [zNumeric]="true"
                    [zMin]="1"
                    placeholder="5"
                  />
                </z-form-control>
                <p class="text-xs text-muted-foreground mt-1">
                  Tempo para descartar observação não confirmada.
                </p>
              </z-form-field>

              <z-form-field>
                <z-form-label for="anpr-recognition-mode">Modo de reconhecimento</z-form-label>
                <z-form-control>
                  <select z-input zSize="lg" id="anpr-recognition-mode" [formField]="pointForm.anprRecognitionMode">
                    <option value="local">Local (somente OCR local)</option>
                    <option value="verified">Verificado (local + API externa)</option>
                    <option value="external">Externo (API externa)</option>
                  </select>
                </z-form-control>
                <p class="text-xs text-muted-foreground mt-1">
                  Como a leitura local é validada. Padrão: Local.
                </p>
              </z-form-field>

              @if (usaApiExterna()) {
                <div class="flex flex-col gap-4 rounded-lg border border-dashed p-4 bg-muted/20">
                  <h4 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">API externa de reconhecimento</h4>

                  <z-form-field>
                    <z-form-label for="anpr-external-provider">Provider</z-form-label>
                    <z-form-control>
                      <select z-input zSize="lg" id="anpr-external-provider" [formField]="pointForm.anprExternalProvider">
                        <option value="google_vision">Google Vision</option>
                      </select>
                    </z-form-control>
                    <p class="text-xs text-muted-foreground mt-1">Padrão: Google Vision.</p>
                  </z-form-field>

                  <div class="grid grid-cols-2 gap-5">
                    <z-form-field>
                      <z-form-label for="anpr-external-confidence">Confiança mínima externa</z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          zSize="lg"
                          id="anpr-external-confidence"
                          type="number"
                          [formField]="pointForm.anprExternalMinConfidence"
                          [zNumeric]="true"
                          [zMin]="0"
                          [zMax]="1"
                          [zStep]="0.05"
                          placeholder="0.7"
                        />
                      </z-form-control>
                      <p class="text-xs text-muted-foreground mt-1">
                        Nível mínimo da API externa (0–1). Padrão: 0.7.
                      </p>
                    </z-form-field>

                    <z-form-field>
                      <z-form-label for="anpr-external-timeout">Timeout externo (ms)</z-form-label>
                      <z-form-control>
                        <input
                          z-input
                          zSize="lg"
                          id="anpr-external-timeout"
                          type="number"
                          [formField]="pointForm.anprExternalTimeoutMs"
                          [zNumeric]="true"
                          [zMin]="100"
                          placeholder="8000"
                        />
                      </z-form-control>
                      <p class="text-xs text-muted-foreground mt-1">
                        Tempo máximo aguardando a API externa. Padrão: 8000 ms.
                      </p>
                    </z-form-field>
                  </div>

                  <z-form-field>
                    <z-form-control>
                      <label class="flex items-center gap-2 text-sm font-medium leading-none">
                        <z-checkbox [formField]="pointForm.anprExternalFallbackToLocal" />
                        Usar leitura local como fallback
                      </label>
                    </z-form-control>
                    <p class="text-xs text-muted-foreground mt-1 ml-6">
                      Usa o OCR local quando a API externa não retornar placa válida.
                    </p>
                  </z-form-field>
                </div>
              }
            }

            @if (anprInherit()) {
              <div class="rounded-lg border border-dashed p-4 text-center bg-muted/20">
                <p class="text-xs text-muted-foreground">
                  Configurações herdadas da empresa. Desative acima para customizar.
                </p>
              </div>
            }
          }

          @if (!pointForm.anprAutoRegister()) {
            <div class="rounded-lg border border-dashed p-4 text-center bg-muted/20">
              <p class="text-xs text-muted-foreground">
                Registre automático desabilitado. Habilite acima para configurar.
              </p>
            </div>
          }
        </div>
      }

      <div class="flex justify-between gap-2 pt-2 border-t">
        @if (nav.currentStep() > 0) {
          <button z-button zType="outline" zSize="default" type="button" (click)="nav.previousStep()">
            Voltar
          </button>
        } @else {
          <button z-button zType="outline" zSize="default" type="button" (click)="cancelar()">
            Cancelar
          </button>
        }

        @if (nav.currentStep() < totalSteps - 1) {
          <button z-button zType="default" zSize="default" type="button" (click)="nav.nextStep()">
            Próximo
          </button>
        } @else {
          <button
            z-button
            zType="default"
            zSize="default"
            type="submit"
            [zLoading]="submitting()"
            [zDisabled]="pointForm().invalid()"
          >
            {{ isEdit() ? 'Salvar' : 'Criar' }}
          </button>
        }
      </div>
    </form>
  `,
})
export class PointFormDialog implements OnInit {
  private readonly dialogRef = inject(ZardDialogRef<PointFormDialog, Point>);
  private readonly data = inject<Point | null>(Z_MODAL_DATA);
  private readonly pointService = inject(PointService);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly logger = inject(LoggerService).create('PointFormDialog');

  protected readonly isEdit = computed(() => this.data !== null);
  protected readonly submitting = signal(false);
  protected readonly adminUnities = signal<AdminUnity[]>([]);
  protected readonly totalSteps = STEP_LABELS.length;
  protected readonly stepLabels = STEP_LABELS;
  protected readonly pointTypeOptions = POINT_TYPE_OPTIONS;
  protected readonly anprInherit = signal(this.data?.inheritCompanyConfig ?? true);

  protected readonly nav = createStepNavigation(STEP_LABELS.length);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<PointFormModel>({
    name: this.data?.name ?? '',
    code: this.data?.code ?? '',
    type: this.data?.type ?? 'both',
    adminUnityId: this.data?.adminUnityId ?? '',
    active: this.data?.active ?? true,
    anprAutoRegister: this.data?.anprAutoRegister ?? true,
    anprSaveUnrecognizedPhotos: this.data?.anprSaveUnrecognizedPhotos ?? false,
    anprAutoRegisterCooldownSeconds: this.data?.anprAutoRegisterCooldownSeconds != null ? Number(this.data.anprAutoRegisterCooldownSeconds) : null,
    anprConfidenceThreshold: this.data?.anprConfidenceThreshold != null ? Number(this.data.anprConfidenceThreshold) : null,
    anprMatchTimeoutSeconds: this.data?.anprMatchTimeoutSeconds != null ? Number(this.data.anprMatchTimeoutSeconds) : null,
    anprConfirmationReads: this.data?.anprConfirmationReads != null ? Number(this.data.anprConfirmationReads) : null,
    anprStaleAfterSeconds: this.data?.anprStaleAfterSeconds != null ? Number(this.data.anprStaleAfterSeconds) : null,
    anprRecognitionMode: this.data?.anprRecognitionMode ?? 'local',
    anprExternalProvider: this.data?.anprExternalProvider ?? 'google_vision',
    anprExternalMinConfidence: this.data?.anprExternalMinConfidence != null ? Number(this.data.anprExternalMinConfidence) : null,
    anprExternalTimeoutMs: this.data?.anprExternalTimeoutMs != null ? Number(this.data.anprExternalTimeoutMs) : null,
    anprExternalFallbackToLocal: this.data?.anprExternalFallbackToLocal ?? true,
  });

  protected readonly pointForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome.' });
      required(fields.code, { message: 'Informe o código.' });
      required(fields.adminUnityId, { message: 'Selecione a unidade administrativa.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const saved = this.data
              ? await this.salvarEdicao(this.data, model)
              : await this.criarPonto(model);

            this.logger.info('Ponto salvo', { id: saved.id });
            toast.success(this.data ? 'Ponto atualizado com sucesso.' : 'Ponto criado com sucesso.');
            this.dialogRef.close(saved);
          } catch (error) {
            this.logger.error('Falha ao salvar ponto', error);
            const message = (error as ApiError).message || 'Falha ao salvar ponto.';
            toast.error(message);
          } finally {
            this.submitting.set(false);
          }
        },
      },
    },
  );

  protected readonly usaApiExterna = computed(() => this.model().anprRecognitionMode !== 'local');

  constructor() {
    afterNextRender(() => {
      const input = this.nameInput()?.nativeElement ?? null;
      input?.focus();
    });
  }

  ngOnInit(): void {
    void this.carregarOpcoes();
  }

  protected getError(field: FieldState<string | number | boolean | null, string>): string {
    return firstError(field);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected onAnprInheritChange(value: boolean): void {
    this.anprInherit.set(value);
  }

  private async carregarOpcoes(): Promise<void> {
    try {
      this.adminUnities.set(await firstValueFrom(this.adminUnityService.list()));
    } catch (error) {
      this.logger.error('Falha ao carregar opções', error);
      toast.error('Falha ao carregar opções.');
    }
  }

  private buildAnprPayload(model: PointFormModel): PointAnprConfig {
    const inherit = this.anprInherit();
    return {
      inheritCompanyConfig: inherit,
      anprAutoRegister: model.anprAutoRegister ? (inherit ? null : true) : false,
      anprSaveUnrecognizedPhotos: inherit ? null : model.anprSaveUnrecognizedPhotos,
      anprAutoRegisterCooldownSeconds: inherit ? null : model.anprAutoRegisterCooldownSeconds,
      anprConfidenceThreshold: inherit ? null : model.anprConfidenceThreshold,
      anprMatchTimeoutSeconds: inherit ? null : model.anprMatchTimeoutSeconds,
      anprConfirmationReads: inherit ? null : model.anprConfirmationReads,
      anprStaleAfterSeconds: inherit ? null : model.anprStaleAfterSeconds,
      anprRecognitionMode: inherit ? null : model.anprRecognitionMode,
      anprExternalProvider: inherit ? null : model.anprExternalProvider,
      anprExternalMinConfidence: inherit ? null : model.anprExternalMinConfidence,
      anprExternalTimeoutMs: inherit ? null : model.anprExternalTimeoutMs,
      anprExternalFallbackToLocal: inherit ? null : model.anprExternalFallbackToLocal,
    };
  }

  private async criarPonto(model: PointFormModel): Promise<Point> {
    const payload: CreatePointRequest = {
      name: model.name,
      code: model.code,
      type: model.type,
      adminUnityId: model.adminUnityId,
      active: model.active,
      ...this.buildAnprPayload(model),
    };
    return firstValueFrom(this.pointService.create(payload));
  }

  private async salvarEdicao(ponto: Point, model: PointFormModel): Promise<Point> {
    const payload: UpdatePointRequest = {
      name: model.name,
      code: model.code,
      type: model.type,
      adminUnityId: model.adminUnityId,
      active: model.active,
      ...this.buildAnprPayload(model),
    };
    return firstValueFrom(this.pointService.update(ponto.id, payload));
  }
}
