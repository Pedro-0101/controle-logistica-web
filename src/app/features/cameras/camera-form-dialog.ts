import { afterNextRender, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

import type {
  AdminUnity,
  ApiError,
  Camera,
  CameraAuthType,
  CreateCameraRequest,
  Point,
  UpdateCameraRequest,
} from '@/shared/models';
import { AdminUnityService } from '@/shared/services/admin-unity.service';
import { CameraService } from '@/shared/services/camera.service';
import { PointService } from '@/shared/services/point.service';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface CameraFormModel {
  adminUnityId: string;
  pointId: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  authType: CameraAuthType;
  snapshotUrl: string;
  description: string;
}

const AUTH_TYPE_OPTIONS: { value: CameraAuthType; label: string }[] = [
  { value: 'digest', label: 'Digest' },
  { value: 'basic', label: 'Basic' },
];

@Component({
  selector: 'app-camera-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="cameraForm" class="flex flex-col gap-4" novalidate>
      <z-form-field>
        <z-form-label [zRequired]="true" for="camera-admin-unity">Unidade administrativa</z-form-label>
        <z-form-control>
          <select z-input id="camera-admin-unity" [formField]="cameraForm.adminUnityId">
            <option value="" disabled>Selecione uma unidade</option>
            @for (unit of adminUnities(); track unit.id) {
              <option [value]="unit.id">{{ unit.name }}</option>
            }
          </select>
        </z-form-control>
        @if (cameraForm.adminUnityId().invalid() && cameraForm.adminUnityId().touched()) {
          <z-form-message id="camera-admin-unity-error" [zError]="true">{{ firstError(cameraForm.adminUnityId()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="camera-point">Ponto de controle</z-form-label>
        <z-form-control>
          <select z-input id="camera-point" [formField]="cameraForm.pointId">
            <option value="" disabled>Selecione um ponto</option>
            @for (point of filteredPoints(); track point.id) {
              <option [value]="point.id">{{ point.name }}</option>
            }
          </select>
        </z-form-control>
        @if (cameraForm.pointId().invalid() && cameraForm.pointId().touched()) {
          <z-form-message id="camera-point-error" [zError]="true">{{ firstError(cameraForm.pointId()) }}</z-form-message>
        }
      </z-form-field>

      <z-form-field>
        <z-form-label [zRequired]="true" for="camera-name">Nome</z-form-label>
        <z-form-control>
          <input
            z-input
            #nameInput
            id="camera-name"
            type="text"
            [formField]="cameraForm.name"
            autocomplete="off"
            placeholder="Câmera Portaria 1"
            [attr.aria-invalid]="cameraForm.name().invalid() && cameraForm.name().touched()"
            [attr.aria-describedby]="cameraForm.name().errors().length ? 'camera-name-error' : null"
          />
        </z-form-control>
        @if (cameraForm.name().invalid() && cameraForm.name().touched()) {
          <z-form-message id="camera-name-error" [zError]="true">{{ firstError(cameraForm.name()) }}</z-form-message>
        }
      </z-form-field>

      <div class="grid grid-cols-2 gap-4">
        <z-form-field>
          <z-form-label [zRequired]="true" for="camera-ip">Endereço IP</z-form-label>
          <z-form-control>
            <input
              z-input
              id="camera-ip"
              type="text"
              [formField]="cameraForm.ip"
              autocomplete="off"
              placeholder="192.168.1.100"
              [attr.aria-invalid]="cameraForm.ip().invalid() && cameraForm.ip().touched()"
              [attr.aria-describedby]="cameraForm.ip().errors().length ? 'camera-ip-error' : null"
            />
          </z-form-control>
          @if (cameraForm.ip().invalid() && cameraForm.ip().touched()) {
            <z-form-message id="camera-ip-error" [zError]="true">{{ firstError(cameraForm.ip()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label for="camera-port">Porta</z-form-label>
          <z-form-control>
            <input
              z-input
              id="camera-port"
              type="number"
              [formField]="cameraForm.port"
              autocomplete="off"
              placeholder="80"
            />
          </z-form-control>
        </z-form-field>
      </div>

      <z-form-field>
        <z-form-label for="camera-username">Usuário</z-form-label>
        <z-form-control>
          <input
            z-input
            id="camera-username"
            type="text"
            [formField]="cameraForm.username"
            autocomplete="off"
            placeholder="admin"
          />
        </z-form-control>
      </z-form-field>

      @if (isCreate()) {
        <z-form-field>
          <z-form-label for="camera-password">Senha</z-form-label>
          <z-form-control>
            <input
              z-input
              id="camera-password"
              type="password"
              [formField]="cameraForm.password"
              autocomplete="new-password"
              placeholder="••••••"
            />
          </z-form-control>
        </z-form-field>
      }

      <z-form-field>
        <z-form-label for="camera-auth-type">Tipo de autenticação</z-form-label>
        <z-form-control>
          <select z-input id="camera-auth-type" [formField]="cameraForm.authType">
            @for (option of authTypeOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="camera-snapshot-url">URL do snapshot</z-form-label>
        <z-form-control>
          <input
            z-input
            id="camera-snapshot-url"
            type="text"
            [formField]="cameraForm.snapshotUrl"
            autocomplete="off"
            placeholder="http://192.168.1.100/ISAPI/Streaming/channels/101/picture"
          />
        </z-form-control>
      </z-form-field>

      <z-form-field>
        <z-form-label for="camera-description">Descrição</z-form-label>
        <z-form-control>
          <input
            z-input
            id="camera-description"
            type="text"
            [formField]="cameraForm.description"
            autocomplete="off"
            placeholder="Entrada principal"
          />
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
          [zDisabled]="cameraForm().invalid()"
        >
          {{ isCreate() ? 'Criar' : 'Salvar' }}
        </button>
      </div>
    </form>
  `,
})
export class CameraFormDialog implements OnInit {
  private readonly dialogRef = inject(ZardDialogRef<CameraFormDialog, Camera>);
  private readonly data = inject<Camera | null>(Z_MODAL_DATA);
  private readonly cameraService = inject(CameraService);
  private readonly adminUnityService = inject(AdminUnityService);
  private readonly pointService = inject(PointService);
  private readonly logger = inject(LoggerService).create('CameraFormDialog');

  protected readonly isCreate = computed(() => this.data === null);
  protected readonly submitting = signal(false);
  protected readonly adminUnities = signal<AdminUnity[]>([]);
  protected readonly points = signal<Point[]>([]);
  protected readonly authTypeOptions = AUTH_TYPE_OPTIONS;

  protected readonly filteredPoints = computed(() => {
    const adminUnityId = this.model().adminUnityId;
    if (!adminUnityId) return this.points();
    return this.points().filter((point) => point.adminUnityId === adminUnityId);
  });

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<CameraFormModel>({
    adminUnityId: this.data?.adminUnityId ?? '',
    pointId: this.data?.pointId ?? '',
    name: this.data?.name ?? '',
    ip: this.data?.ip ?? '',
    port: this.data?.port ?? 80,
    username: this.data?.username ?? '',
    password: '',
    authType: this.data?.authType ?? 'digest',
    snapshotUrl: this.data?.snapshotUrl ?? '',
    description: this.data?.description ?? '',
  });

  protected readonly cameraForm = form(
    this.model,
    (fields) => {
      required(fields.adminUnityId, { message: 'Selecione a unidade administrativa.' });
      required(fields.pointId, { message: 'Selecione o ponto de controle.' });
      required(fields.name, { message: 'Informe o nome.' });
      required(fields.ip, { message: 'Informe o endereço IP.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const saved = this.data
              ? await this.salvarEdicao(this.data, model)
              : await this.criarCamera(model);

            this.logger.info('Câmera salva', { id: saved.id });
            toast.success(this.data ? 'Câmera atualizada com sucesso.' : 'Câmera criada com sucesso.');
            this.dialogRef.close(saved);
          } catch (error) {
            this.logger.error('Falha ao salvar câmera', error);
            const message = (error as ApiError).message || 'Falha ao salvar câmera.';
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
      const [adminUnities, points] = await Promise.all([
        firstValueFrom(this.adminUnityService.list()),
        firstValueFrom(this.pointService.list()),
      ]);
      this.adminUnities.set(adminUnities);
      this.points.set(points);
    } catch (error) {
      this.logger.error('Falha ao carregar opções', error);
      toast.error('Falha ao carregar opções.');
    }
  }

  private async criarCamera(model: CameraFormModel): Promise<Camera> {
    const payload: CreateCameraRequest = {
      adminUnityId: model.adminUnityId,
      pointId: model.pointId,
      name: model.name,
      ip: model.ip,
      port: model.port,
      username: model.username,
      password: model.password,
      authType: model.authType,
      snapshotUrl: model.snapshotUrl || undefined,
      description: model.description || undefined,
    };
    return firstValueFrom(this.cameraService.create(payload));
  }

  private async salvarEdicao(camera: Camera, model: CameraFormModel): Promise<Camera> {
    const payload: UpdateCameraRequest = {
      adminUnityId: model.adminUnityId,
      pointId: model.pointId,
      name: model.name,
      ip: model.ip,
      port: model.port,
      username: model.username,
      authType: model.authType,
      snapshotUrl: model.snapshotUrl || undefined,
      description: model.description || undefined,
    };
    return firstValueFrom(this.cameraService.update(camera.id, payload));
  }
}
