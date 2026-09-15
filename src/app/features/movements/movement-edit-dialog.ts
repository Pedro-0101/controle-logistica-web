import { afterNextRender, Component, inject, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import type {
  ApiError,
  MovementDetail,
  MovementEditableStatus,
  MovementListItem,
  UpdateMovementPayload,
} from '@/shared/models';
import { MovementService } from '@/shared/services/movement.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface MovementEditModel {
  dateTime: string;
  status: MovementEditableStatus;
  driverName: string;
  purpose: string;
  notes: string;
}

const STATUS_OPTIONS: { value: MovementEditableStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'closed', label: 'Fechado' },
];

/** Converte um ISO 8601 para o formato aceito por `<input type="datetime-local">`. */
function toLocalDateTimeInput(iso: string): string {
  const data = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

/** Converte o valor de `<input type="datetime-local">` para ISO 8601 UTC. */
function fromLocalDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

/**
 * Dialog de edição dos dados operacionais de um movimento
 * (`PATCH /movement/{id}`): data/hora, status, motorista, motivo e notas.
 * Apenas os campos alterados são enviados.
 */
@Component({
  selector: 'app-movement-edit-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="editForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label for="movement-datetime">Data e hora</z-form-label>
        <z-form-control>
          <input
            z-input
            #datetimeInput
            id="movement-datetime"
            type="datetime-local"
            [formField]="editForm.dateTime"
          />
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="movement-status">Status</z-form-label>
        <z-form-control>
          <select z-input id="movement-status" [formField]="editForm.status">
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="movement-driver">Motorista</z-form-label>
        <z-form-control>
          <input
            z-input
            id="movement-driver"
            type="text"
            [formField]="editForm.driverName"
            autocomplete="off"
            placeholder="João Silva"
          />
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="movement-purpose">Motivo</z-form-label>
        <z-form-control>
          <input
            z-input
            id="movement-purpose"
            type="text"
            [formField]="editForm.purpose"
            autocomplete="off"
            placeholder="Entrega de mercadoria"
          />
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="movement-notes">Observações</z-form-label>
        <z-form-control>
          <textarea z-input id="movement-notes" rows="3" [formField]="editForm.notes"></textarea>
        </z-form-control>
      </z-form-field>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button z-button zType="ghost" type="button" (click)="cancelar()">Cancelar</button>
        <button z-button zType="default" type="submit" [zLoading]="submitting()">Salvar</button>
      </div>
    </form>
  `,
})
export class MovementEditDialog {
  private readonly dialogRef = inject(ZardDialogRef<MovementEditDialog, MovementDetail | null>);
  private readonly movimento = inject<MovementListItem>(Z_MODAL_DATA);
  private readonly movementService = inject(MovementService);
  private readonly logger = inject(LoggerService).create('MovementEditDialog');

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly submitting = signal(false);

  private readonly datetimeInput = viewChild<ElementRef<HTMLInputElement>>('datetimeInput');

  private readonly original: Required<
    Pick<MovementEditModel, 'driverName' | 'purpose' | 'notes'>
  > & {
    dateTime: string;
    status: MovementEditableStatus;
  } = {
    dateTime: toLocalDateTimeInput(this.movimento.dateTime),
    status: this.movimento.status === 'closed' ? 'closed' : 'open',
    driverName: this.movimento.driverName ?? '',
    purpose: this.movimento.purpose ?? '',
    notes: this.movimento.notes ?? '',
  };

  private readonly model = signal<MovementEditModel>({ ...this.original });

  protected readonly editForm = form(this.model, () => {}, {
    submission: {
      action: async () => {
        await this.salvar();
      },
    },
  });

  constructor() {
    afterNextRender(() => {
      this.datetimeInput()?.nativeElement.focus();
    });
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  private async salvar(): Promise<void> {
    const payload = this.construirPayload();
    if (Object.keys(payload).length === 0) {
      this.dialogRef.close(null);
      return;
    }

    this.submitting.set(true);
    try {
      const saved = await firstValueFrom(this.movementService.update(this.movimento.id, payload));
      this.logger.info('Movimento atualizado', { id: saved.id, campos: Object.keys(payload) });
      toast.success('Movimentação atualizada com sucesso.');
      this.dialogRef.close(saved);
    } catch (error) {
      const apiError = error as ApiError;
      this.logger.error('Falha ao atualizar movimento', error);
      toast.error(apiError?.message || 'Falha ao atualizar movimentação.');
    } finally {
      this.submitting.set(false);
    }
  }

  /** Monta o payload enviando apenas os campos alterados em relação ao original. */
  private construirPayload(): UpdateMovementPayload {
    const model = this.model();
    const payload: UpdateMovementPayload = {};

    if (model.dateTime !== this.original.dateTime) {
      payload.dateTime = fromLocalDateTimeInput(model.dateTime);
    }
    if (model.status !== this.original.status) {
      payload.status = model.status;
    }
    if (model.driverName !== this.original.driverName) {
      payload.driverName = model.driverName.trim();
    }
    if (model.purpose !== this.original.purpose) {
      payload.purpose = model.purpose.trim();
    }
    if (model.notes !== this.original.notes) {
      payload.notes = model.notes.trim();
    }

    return payload;
  }
}
