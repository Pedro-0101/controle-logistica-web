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
  PointType,
  UpdatePointRequest,
} from '@/shared/models';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { PointService } from '@/shared/services/point.service';
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

interface PointFormModel {
  name: string;
  code: string;
  type: PointType;
  adminUnityId: string;
  active: boolean;
}

const POINT_TYPE_OPTIONS: { value: PointType; label: string }[] = [
  { value: 'entry', label: 'Entrada' },
  { value: 'exit', label: 'Saída' },
  { value: 'both', label: 'Entrada/Saída' },
];

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
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="pointForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label [zRequired]="true" for="point-name">Nome</z-form-label>
        <z-form-control>
          <input
            z-input
            #nameInput
            id="point-name"
            type="text"
            [formField]="pointForm.name"
            autocomplete="off"
            placeholder="Portão 1"
            [attr.aria-invalid]="pointForm.name().invalid() && pointForm.name().touched()"
            [attr.aria-describedby]="pointForm.name().errors().length ? 'point-name-error' : null"
          />
        </z-form-control>
        @if (pointForm.name().invalid() && pointForm.name().touched()) {
          <z-form-message id="point-name-error" [zError]="true">{{ firstError(pointForm.name()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="point-code">Código</z-form-label>
        <z-form-control>
          <input
            z-input
            id="point-code"
            type="text"
            [formField]="pointForm.code"
            autocomplete="off"
            placeholder="P-001"
            [attr.aria-invalid]="pointForm.code().invalid() && pointForm.code().touched()"
            [attr.aria-describedby]="pointForm.code().errors().length ? 'point-code-error' : null"
          />
        </z-form-control>
        @if (pointForm.code().invalid() && pointForm.code().touched()) {
          <z-form-message id="point-code-error" [zError]="true">{{ firstError(pointForm.code()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="point-type">Tipo</z-form-label>
        <z-form-control>
          <select z-input id="point-type" [formField]="pointForm.type">
            @for (option of pointTypeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="point-admin-unity">Unidade administrativa</z-form-label>
        <z-form-control>
          <select z-input id="point-admin-unity" [formField]="pointForm.adminUnityId">
            <option value="" disabled>Selecione uma unidade</option>
            @for (unit of adminUnities(); track unit.id) {
              <option [value]="unit.id">{{ unit.name }}</option>
            }
          </select>
        </z-form-control>
        @if (pointForm.adminUnityId().invalid() && pointForm.adminUnityId().touched()) {
          <z-form-message id="point-admin-unity-error" [zError]="true">{{ firstError(pointForm.adminUnityId()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-control>
          <label class="flex items-center gap-2 text-sm font-medium leading-none">
            <z-checkbox [formField]="pointForm.active" />
            Ponto ativo
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
          [zDisabled]="pointForm().invalid()"
        >
          {{ isEdit() ? 'Salvar' : 'Criar' }}
        </button>
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

  protected readonly pointTypeOptions = POINT_TYPE_OPTIONS;

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<PointFormModel>({
    name: this.data?.name ?? '',
    code: this.data?.code ?? '',
    type: this.data?.type ?? 'both',
    adminUnityId: this.data?.adminUnityId ?? '',
    active: this.data?.active ?? true,
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

  constructor() {
    afterNextRender(() => {
      const input = this.nameInput()?.nativeElement ?? null;
      input?.focus();
    });
  }

  ngOnInit(): void {
    void this.carregarOpcoes();
  }

  protected firstError(field: FieldState<string, string>): string {
    const errors = field.errors();
    return errors.length ? errors[0].message ?? 'Valor inválido.' : '';
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  private async carregarOpcoes(): Promise<void> {
    try {
      this.adminUnities.set(await firstValueFrom(this.adminUnityService.list()));
    } catch (error) {
      this.logger.error('Falha ao carregar opções', error);
      toast.error('Falha ao carregar opções.');
    }
  }

  private async criarPonto(model: PointFormModel): Promise<Point> {
    const payload: CreatePointRequest = {
      name: model.name,
      code: model.code,
      type: model.type,
      adminUnityId: model.adminUnityId,
      active: model.active,
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
    };
    return firstValueFrom(this.pointService.update(ponto.id, payload));
  }
}
