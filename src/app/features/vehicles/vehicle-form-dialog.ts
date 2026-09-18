import { afterNextRender, Component, computed, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import type { ApiError, CreateVehicleRequest, UpdateVehicleRequest, Vehicle, VehicleType } from '@/shared/models';
import { VehicleService } from '@/shared/services/vehicle.service';
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

@Component({
  selector: 'app-vehicle-form-dialog',
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
    <form [formRoot]="vehicleForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label [zRequired]="true" for="vehicle-plate">Placa</z-form-label>
        <z-form-control>
          <input
            z-input
            #plateInput
            id="vehicle-plate"
            type="text"
            [formField]="vehicleForm.plate"
            autocomplete="off"
            placeholder="ABC1D23"
            [attr.aria-invalid]="vehicleForm.plate().invalid() && vehicleForm.plate().touched()"
            [attr.aria-describedby]="vehicleForm.plate().errors().length ? 'vehicle-plate-error' : null"
          />
        </z-form-control>
        @if (vehicleForm.plate().invalid() && vehicleForm.plate().touched()) {
          <z-form-message id="vehicle-plate-error" [zError]="true">{{ firstError(vehicleForm.plate()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="vehicle-type">Tipo</z-form-label>
        <z-form-control>
          <select z-input id="vehicle-type" [formField]="vehicleForm.type">
            @for (option of vehicleTypeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </z-form-control>
      </z-form-field>

      @if (isOwnVehicle()) {
        <z-form-field>
          <z-form-label [zRequired]="true" for="vehicle-code">Código</z-form-label>
          <z-form-control>
            <input
              z-input
              id="vehicle-code"
              type="text"
              [formField]="vehicleForm.code"
              autocomplete="off"
              placeholder="VEH-001"
              [attr.aria-invalid]="vehicleForm.code().invalid() && vehicleForm.code().touched()"
              [attr.aria-describedby]="vehicleForm.code().errors().length ? 'vehicle-code-error' : null"
            />
          </z-form-control>
          @if (vehicleForm.code().invalid() && vehicleForm.code().touched()) {
            <z-form-message id="vehicle-code-error" [zError]="true">{{ firstError(vehicleForm.code()) }}</z-form-message>
          }
        </z-form-field>
      }

      <z-form-field>
        <z-form-label for="vehicle-notes">Observações</z-form-label>
        <z-form-control>
          <textarea
            z-input
            id="vehicle-notes"
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
        <button z-button zType="ghost" zSize="default" type="button" (click)="cancelar()">Cancelar</button>
        <button
          z-button
          zType="default"
          zSize="default"
          type="submit"
          [zLoading]="submitting()"
          [zDisabled]="vehicleForm().invalid()"
        >
          {{ isCreate() ? 'Criar' : 'Salvar' }}
        </button>
      </div>
    </form>
  `,
})
export class VehicleFormDialog {
  private readonly dialogRef = inject(ZardDialogRef<VehicleFormDialog, Vehicle>);
  private readonly data = inject<Vehicle | null>(Z_MODAL_DATA);
  private readonly vehicleService = inject(VehicleService);
  private readonly logger = inject(LoggerService).create('VehicleFormDialog');

  protected readonly isCreate = computed(() => this.data === null);
  protected readonly submitting = signal(false);
  protected readonly vehicleTypeOptions = VEHICLE_TYPE_OPTIONS;

  private readonly plateInput = viewChild<ElementRef<HTMLInputElement>>('plateInput');

  private readonly model = signal<VehicleFormModel>({
    plate: this.data?.plate ?? '',
    code: this.data?.code ?? '',
    type: this.data?.type ?? 'own',
    active: this.data?.active ?? true,
    notes: this.data?.notes ?? '',
  });

  protected readonly isOwnVehicle = computed(() => this.model().type === 'own');

  protected readonly vehicleForm = form(
    this.model,
    (fields) => {
      required(fields.plate, { message: 'Informe a placa.' });
      required(fields.code, { message: 'Informe o código.', when: () => this.isOwnVehicle() });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const data = this.data;
            const code = model.type === 'own' ? { code: model.code } : {};
            const notes = model.notes.trim();

            if (data) {
              const payload: UpdateVehicleRequest = {
                plate: model.plate,
                ...code,
                type: model.type,
                active: model.active,
                notes,
              };
              const saved = await firstValueFrom(this.vehicleService.update(data.id, payload));
              this.logger.info('Veículo salvo', { id: saved.id });
              toast.success('Veículo atualizado com sucesso.');
              this.dialogRef.close(saved);
            } else {
              const payload: CreateVehicleRequest = {
                plate: model.plate,
                ...code,
                type: model.type,
                active: model.active,
                ...(notes ? { notes } : {}),
              };
              const saved = await firstValueFrom(this.vehicleService.create(payload));
              this.logger.info('Veículo salvo', { id: saved.id });
              toast.success('Veículo criado com sucesso.');
              this.dialogRef.close(saved);
            }
          } catch (error) {
            this.logger.error('Falha ao salvar veículo', error);
            const message = (error as ApiError).message || 'Falha ao salvar veículo.';
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
      const input = this.plateInput()?.nativeElement ?? null;
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
}
