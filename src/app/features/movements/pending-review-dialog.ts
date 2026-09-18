import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import type {
  ApiError,
  CreateVehicleRequest,
  MovementDetail,
  PendingReviewMovement,
  VehicleType,
} from '@/shared/models';
import { MovementService } from '@/shared/services/movement.service';
import { VehicleService } from '@/shared/services/vehicle.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardBadgeComponent } from '@/shared/components/badge';
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

interface PlateFormModel {
  plate: string;
}

interface VehicleFormModel {
  plate: string;
  code: string;
  type: VehicleType;
  active: boolean;
  notes: string;
}

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'own', label: 'Próprio' },
  { value: 'thirdParty', label: 'Terceiro' },
  { value: 'visitor', label: 'Visitante' },
];

/**
 * Dialog de revisão de um movimento `pending_review`.
 *
 * Dois fluxos:
 * - **Corrigir placa**: informa a placa correta de um veículo já cadastrado
 *   (`POST /movement/:id/recalculate` com `{ plate }`).
 * - **Cadastrar veículo**: cria o veículo (`POST /vehicle`) e vincula ao
 *   movimento (`recalculate` com `{ vehicleId }`).
 */
@Component({
  selector: 'app-pending-review-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <z-badge [zType]="movimento.type === 'entry' ? 'default' : 'secondary'" zShape="pill">
          {{ movimento.type === 'entry' ? 'Entrada' : 'Saída' }}
        </z-badge>
        <span>{{ formatarData(movimento.dateTime) }}</span>
        <span aria-hidden="true">•</span>
        <span class="font-mono">{{ movimento.recognizedPlate ?? '—' }}</span>
        <span>lida pela câmera</span>
      </div>

      @if (modo() === 'plate') {
        <form [formRoot]="plateForm" class="flex flex-col gap-4" novalidate>
          <z-form-field>
            <z-form-label [zRequired]="true" for="review-plate">Placa correta</z-form-label>
            <z-form-control>
              <input
                z-input
                #plateInput
                id="review-plate"
                type="text"
                [formField]="plateForm.plate"
                autocomplete="off"
                placeholder="ABC1D23"
                class="font-mono uppercase"
                [attr.aria-invalid]="plateForm.plate().invalid() && plateForm.plate().touched()"
                [attr.aria-describedby]="
                  plateForm.plate().errors().length ? 'review-plate-error' : null
                "
              />
            </z-form-control>
            @if (plateForm.plate().invalid() && plateForm.plate().touched()) {
              <z-form-message id="review-plate-error" [zError]="true">
                {{ firstError(plateForm.plate()) }}
              </z-form-message>
            }
          </z-form-field>

          @if (placaNaoEncontrada()) {
            <p class="text-sm text-warning" role="alert">
              Nenhum veículo cadastrado com esta placa. Cadastre o veículo para vincular ao
              movimento.
            </p>
          }

          <button
            z-button
            zType="link"
            zSize="sm"
            type="button"
            class="self-start px-0"
            (click)="irParaCadastro()"
          >
            Cadastrar novo veículo
          </button>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button z-button zType="ghost" type="button" (click)="cancelar()">Cancelar</button>
            <button
              z-button
              zType="default"
              type="submit"
              [zLoading]="submitting()"
              [zDisabled]="plateForm().invalid()"
            >
              Confirmar placa
            </button>
          </div>
        </form>
      } @else {
        <form [formRoot]="vehicleForm" class="flex flex-col gap-4" novalidate>
          <z-form-field>
            <z-form-label [zRequired]="true" for="review-vehicle-type">Tipo</z-form-label>
            <z-form-control>
              <select z-input id="review-vehicle-type" [formField]="vehicleForm.type">
                @for (option of vehicleTypeOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </z-form-control>
          </z-form-field>

          <z-form-field>
            <z-form-label [zRequired]="true" for="review-vehicle-plate">Placa</z-form-label>
            <z-form-control>
              <input
                z-input
                #vehiclePlateInput
                id="review-vehicle-plate"
                type="text"
                [formField]="vehicleForm.plate"
                autocomplete="off"
                placeholder="ABC1D23"
                class="font-mono uppercase"
                [attr.aria-invalid]="vehicleForm.plate().invalid() && vehicleForm.plate().touched()"
                [attr.aria-describedby]="
                  vehicleForm.plate().errors().length ? 'review-vehicle-plate-error' : null
                "
              />
            </z-form-control>
            @if (vehicleForm.plate().invalid() && vehicleForm.plate().touched()) {
              <z-form-message id="review-vehicle-plate-error" [zError]="true">
                {{ firstError(vehicleForm.plate()) }}
              </z-form-message>
            }
          </z-form-field>

          @if (isOwnVehicle()) {
            <z-form-field>
              <z-form-label [zRequired]="true" for="review-vehicle-code">Código</z-form-label>
              <z-form-control>
                <input
                  z-input
                  id="review-vehicle-code"
                  type="text"
                  [formField]="vehicleForm.code"
                  autocomplete="off"
                  placeholder="VEH-001"
                  [attr.aria-invalid]="vehicleForm.code().invalid() && vehicleForm.code().touched()"
                  [attr.aria-describedby]="
                    vehicleForm.code().errors().length ? 'review-vehicle-code-error' : null
                  "
                />
              </z-form-control>
              @if (vehicleForm.code().invalid() && vehicleForm.code().touched()) {
                <z-form-message id="review-vehicle-code-error" [zError]="true">
                  {{ firstError(vehicleForm.code()) }}
                </z-form-message>
              }
            </z-form-field>
          } @else {
            <p class="text-sm text-muted-foreground">
              O código do veículo será gerado automaticamente.
            </p>
          }

          <z-form-field>
            <z-form-label for="review-vehicle-notes">Observações</z-form-label>
            <z-form-control>
              <textarea
                z-input
                id="review-vehicle-notes"
                rows="3"
                [formField]="vehicleForm.notes"
                placeholder="Informações adicionais sobre o veículo"
              ></textarea>
            </z-form-control>
          </z-form-field>

          <z-form-field>
            <z-form-control>
              <label class="flex items-center gap-2 text-sm font-medium leading-none">
                <z-checkbox [formField]="vehicleForm.active" />
                Veículo ativo
              </label>
            </z-form-control>
          </z-form-field>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button z-button zType="ghost" type="button" (click)="voltarParaPlaca()">Voltar</button>
            <button
              z-button
              zType="default"
              type="submit"
              [zLoading]="submitting()"
              [zDisabled]="vehicleForm().invalid()"
            >
              Cadastrar e vincular
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class PendingReviewDialog {
  private readonly dialogRef = inject(ZardDialogRef<PendingReviewDialog, MovementDetail | null>);
  protected readonly movimento = inject<PendingReviewMovement>(Z_MODAL_DATA);
  private readonly movementService = inject(MovementService);
  private readonly vehicleService = inject(VehicleService);
  private readonly logger = inject(LoggerService).create('PendingReviewDialog');

  protected readonly modo = signal<'plate' | 'register'>('plate');
  protected readonly submitting = signal(false);
  protected readonly placaNaoEncontrada = signal(false);
  protected readonly vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;

  private readonly plateInput = viewChild<ElementRef<HTMLInputElement>>('plateInput');
  private readonly vehiclePlateInput = viewChild<ElementRef<HTMLInputElement>>('vehiclePlateInput');

  private readonly plateModel = signal<PlateFormModel>({
    plate: this.movimento?.recognizedPlate ?? '',
  });

  protected readonly plateForm = form(
    this.plateModel,
    (fields) => {
      required(fields.plate, { message: 'Informe a placa.' });
    },
    {
      submission: {
        action: async () => {
          await this.confirmarPlaca(this.plateModel().plate);
        },
      },
    },
  );

  private readonly vehicleModel = signal<VehicleFormModel>({
    plate: this.movimento?.recognizedPlate ?? '',
    code: '',
    type: 'visitor',
    active: true,
    notes: '',
  });

  protected readonly isOwnVehicle = computed(() => this.vehicleModel().type === 'own');

  protected readonly vehicleForm = form(
    this.vehicleModel,
    (fields) => {
      required(fields.plate, { message: 'Informe a placa.' });
      required(fields.code, {
        message: 'Informe o código.',
        when: () => this.isOwnVehicle(),
      });
    },
    {
      submission: {
        action: async () => {
          await this.cadastrarEVincular();
        },
      },
    },
  );

  constructor() {
    afterNextRender(() => {
      this.plateInput()?.nativeElement.focus();
    });
  }

  protected irParaCadastro(): void {
    this.vehicleModel.update((model) => ({ ...model, plate: this.plateModel().plate }));
    this.modo.set('register');
    this.placaNaoEncontrada.set(false);
    setTimeout(() => this.vehiclePlateInput()?.nativeElement.focus(), 0);
  }

  protected voltarParaPlaca(): void {
    this.plateModel.update((model) => ({ ...model, plate: this.vehicleModel().plate }));
    this.modo.set('plate');
    setTimeout(() => this.plateInput()?.nativeElement.focus(), 0);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected firstError(field: FieldState<string, string>): string {
    const errors = field.errors();
    return errors.length ? (errors[0].message ?? 'Valor inválido.') : '';
  }

  private async confirmarPlaca(plate: string): Promise<void> {
    this.submitting.set(true);
    this.placaNaoEncontrada.set(false);
    try {
      const saved = await firstValueFrom(
        this.movementService.recalculate(this.movimento.id, { plate: plate.trim().toUpperCase() }),
      );
      this.logger.info('Movimento recalculado', { id: saved.id });
      toast.success('Movimento confirmado com sucesso.');
      this.dialogRef.close(saved);
    } catch (error) {
      this.tratarErroRecalculo(error, 'Falha ao confirmar placa.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async cadastrarEVincular(): Promise<void> {
    this.submitting.set(true);
    try {
      const model = this.vehicleModel();
      const notes = model.notes.trim();
      const payload: CreateVehicleRequest = {
        plate: model.plate.trim().toUpperCase(),
        type: model.type,
        active: model.active,
        ...(model.type === 'own' ? { code: model.code.trim() } : {}),
        ...(notes ? { notes } : {}),
      };
      const vehicle = await firstValueFrom(this.vehicleService.create(payload));
      this.logger.info('Veículo criado', { id: vehicle.id });

      const saved = await firstValueFrom(
        this.movementService.recalculate(this.movimento.id, { vehicleId: vehicle.id }),
      );
      this.logger.info('Movimento recalculado', { id: saved.id });
      toast.success('Veículo cadastrado e movimento confirmado.');
      this.dialogRef.close(saved);
    } catch (error) {
      this.tratarErroRecalculo(error, 'Falha ao cadastrar veículo.');
    } finally {
      this.submitting.set(false);
    }
  }

  private tratarErroRecalculo(error: unknown, fallback: string): void {
    const apiError = error as ApiError;
    this.logger.error('Falha na revisão de movimento', error);

    if (apiError?.status === 404) {
      this.placaNaoEncontrada.set(true);
      this.modo.set('plate');
      return;
    }

    if (apiError?.status === 409) {
      toast.error('Este movimento já foi processado anteriormente.');
      this.dialogRef.close(null);
      return;
    }

    toast.error(apiError?.message || fallback);
  }
}
