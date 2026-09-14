import { afterNextRender, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

import type { ApiError, CreateUserRequest, ManagedUser, Point, UpdateUserRequest, UserRole } from '@/shared/models';
import { LoggerService } from '@/shared/services/logger.service';
import { PointService } from '@/shared/services/point.service';
import { UserService } from '@/shared/services/user.service';
import { firstError } from '@/shared/utils/form-utils';
import { createStepNavigation } from '@/shared/utils/step-navigation';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
  ZardFormStepperComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';

interface UserFormModel {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const STEP_LABELS = ['Dados do usuário', 'Pontos de acesso'];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Usuário' },
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
];

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardFormStepperComponent,
    ZardInputDirective,
  ],
  template: `
    <form [formRoot]="userForm" class="flex flex-col gap-4" novalidate>
      <z-form-stepper
        [steps]="stepLabels"
        [currentStep]="nav.currentStep()"
        (stepChange)="onStepChange($event)"
      />

      @if (nav.currentStep() === 0) {
        <z-form-field>
          <z-form-label [zRequired]="true" for="user-name">Nome</z-form-label>
          <z-form-control>
            <input
              z-input
              #nameInput
              id="user-name"
              type="text"
              [formField]="userForm.name"
              autocomplete="off"
              placeholder="Nome completo"
              [attr.aria-invalid]="userForm.name().invalid() && userForm.name().touched()"
              [attr.aria-describedby]="userForm.name().errors().length ? 'user-name-error' : null"
            />
          </z-form-control>
          @if (userForm.name().invalid() && userForm.name().touched()) {
            <z-form-message id="user-name-error" [zError]="true">{{ getError(userForm.name()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="user-email">E-mail</z-form-label>
          <z-form-control>
            <input
              z-input
              id="user-email"
              type="email"
              [formField]="userForm.email"
              autocomplete="off"
              inputmode="email"
              placeholder="seu@email.com"
              [attr.aria-invalid]="userForm.email().invalid() && userForm.email().touched()"
              [attr.aria-describedby]="userForm.email().errors().length ? 'user-email-error' : null"
            />
          </z-form-control>
          @if (userForm.email().invalid() && userForm.email().touched()) {
            <z-form-message id="user-email-error" [zError]="true">{{ getError(userForm.email()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="!isEdit()" for="user-password">Senha</z-form-label>
          <z-form-control>
            <input
              z-input
              id="user-password"
              [zPass]="true"
              [zMinlength]="6"
              [formField]="userForm.password"
              autocomplete="new-password"
              [placeholder]="isEdit() ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'"
              [attr.aria-invalid]="userForm.password().invalid() && userForm.password().touched()"
              [attr.aria-describedby]="userForm.password().errors().length ? 'user-password-error' : null"
            />
          </z-form-control>
          @if (userForm.password().invalid() && userForm.password().touched()) {
            <z-form-message id="user-password-error" [zError]="true">{{ getError(userForm.password()) }}</z-form-message>
          }
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true" for="user-role">Função</z-form-label>
          <z-form-control>
            <select z-input id="user-role" [formField]="userForm.role">
              @for (option of roleOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </z-form-control>
        </z-form-field>
      }

      @if (nav.currentStep() === 1) {
        @if (loadingPoints()) {
          <div class="py-10 text-center text-muted-foreground">Carregando pontos...</div>
        } @else if (availablePoints().length === 0) {
          <div class="py-10 text-center text-muted-foreground">
            Nenhum ponto de controle disponível para vinculação.
          </div>
        } @else {
          <div class="flex flex-col gap-2">
            <p class="text-sm text-muted-foreground mb-2">
              Selecione os pontos de controle que este usuário poderá operar.
            </p>
            @for (point of availablePoints(); track point.id) {
              <label
                class="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                [class.bg-primary/5]="isPointSelected(point.id)"
                [class.border-primary]="isPointSelected(point.id)"
              >
                <input
                  type="checkbox"
                  class="size-4 rounded border-muted-foreground/40"
                  [checked]="isPointSelected(point.id)"
                  (change)="togglePoint(point.id)"
                  [attr.aria-describedby]="'point-desc-' + point.id"
                />
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium">{{ point.name }}</span>
                  <span class="text-xs text-muted-foreground" [id]="'point-desc-' + point.id">
                    {{ point.code }} · {{ pointTypeLabel(point.type) }}
                  </span>
                </div>
              </label>
            }
          </div>
        }
      }

      <div class="flex items-center justify-between pt-2">
        <button
          z-button
          zType="ghost"
          zSize="default"
          type="button"
          (click)="nav.currentStep() > 0 ? onStepChange(nav.currentStep() - 1) : cancelar()"
        >
          {{ nav.currentStep() > 0 ? 'Anterior' : 'Cancelar' }}
        </button>

        @if (nav.currentStep() < totalSteps - 1) {
          <button
            z-button
            zType="default"
            zSize="default"
            type="button"
            (click)="onStepChange(nav.currentStep() + 1)"
            [zDisabled]="!isCurrentStepValid()"
          >
            Próximo
          </button>
        } @else {
          <button
            z-button
            zType="default"
            zSize="default"
            type="submit"
            [zLoading]="submitting()"
            [zDisabled]="userForm().invalid()"
          >
            {{ isEdit() ? 'Salvar' : 'Criar' }}
          </button>
        }
      </div>
    </form>
  `,
})
export class UserFormDialog implements OnInit {
  private readonly dialogRef = inject(ZardDialogRef<UserFormDialog, ManagedUser>);
  private readonly data = inject<ManagedUser | null>(Z_MODAL_DATA);
  private readonly userService = inject(UserService);
  private readonly pointService = inject(PointService);
  private readonly logger = inject(LoggerService).create('UserFormDialog');

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly stepLabels = STEP_LABELS;
  protected readonly totalSteps = STEP_LABELS.length;
  protected readonly isEdit = computed(() => this.data !== null);
  protected readonly submitting = signal(false);
  protected readonly loadingPoints = signal(false);
  protected readonly availablePoints = signal<Point[]>([]);
  protected readonly selectedPointIds = signal<Set<string>>(new Set());

  protected readonly nav = createStepNavigation(STEP_LABELS.length);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly model = signal<UserFormModel>({
    name: this.data?.name ?? '',
    email: this.data?.email ?? '',
    password: '',
    role: this.data?.role ?? 'user',
  });

  protected readonly userForm = form(
    this.model,
    (fields) => {
      required(fields.name, { message: 'Informe o nome.' });
      required(fields.email, { message: 'Informe o e-mail.' });
      email(fields.email, { message: 'E-mail inválido.' });
      required(fields.password, { message: 'Informe a senha.', when: () => !this.isEdit() });
      minLength(fields.password, 6, {
        message: 'A senha deve ter no mínimo 6 caracteres.',
        when: () => this.model().password.length > 0,
      });
      required(fields.role, { message: 'Informe a função.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();

          try {
            const saved = this.data
              ? await this.salvarEdicao(this.data, model)
              : await this.criarUsuario(model);

            await this.salvarPontos(saved.id);

            this.logger.info('Usuário salvo', { id: saved.id });
            toast.success(this.data ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
            this.dialogRef.close(saved);
          } catch (error) {
            this.logger.error('Falha ao salvar usuário', error);
            const message = (error as ApiError).message || 'Falha ao salvar usuário.';
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
    void this.carregarPontos();
  }

  protected getError(field: FieldState<string, string>): string {
    return firstError(field);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected onStepChange(index: number): void {
    if (index < this.nav.currentStep()) {
      this.nav.goToStep(index);
      return;
    }
    if (this.isCurrentStepValid()) {
      this.nav.goToStep(index);
    }
  }

  protected isCurrentStepValid(): boolean {
    if (this.nav.currentStep() === 0) {
      const m = this.model();
      return !!m.name && !!m.email && !!m.role && (!this.isEdit() || true) && (this.isEdit() || !!m.password);
    }
    return true;
  }

  protected isPointSelected(pointId: string): boolean {
    return this.selectedPointIds().has(pointId);
  }

  protected togglePoint(pointId: string): void {
    this.selectedPointIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
      }
      return next;
    });
  }

  protected pointTypeLabel(type: string): string {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'exit':
        return 'Saída';
      case 'both':
        return 'Entrada e Saída';
      default:
        return type;
    }
  }

  private async carregarPontos(): Promise<void> {
    this.loadingPoints.set(true);
    try {
      const points = await firstValueFrom(this.pointService.list());
      this.availablePoints.set(points);

      if (this.data) {
        const linkedPoints = await firstValueFrom(this.userService.listPoints(this.data.id));
        this.selectedPointIds.set(new Set(linkedPoints.map((p) => p.id)));
      }
    } catch (error) {
      this.logger.error('Falha ao carregar pontos', error);
      toast.error('Falha ao carregar pontos de controle.');
    } finally {
      this.loadingPoints.set(false);
    }
  }

  private async salvarPontos(userId: string): Promise<void> {
    const pointIds = Array.from(this.selectedPointIds());
    await firstValueFrom(this.userService.updatePoints(userId, pointIds));
  }

  private async criarUsuario(model: UserFormModel): Promise<ManagedUser> {
    const payload: CreateUserRequest = {
      name: model.name,
      email: model.email,
      password: model.password,
      role: model.role,
    };
    return firstValueFrom(this.userService.create(payload));
  }

  private async salvarEdicao(usuario: ManagedUser, model: UserFormModel): Promise<ManagedUser> {
    const payload: UpdateUserRequest = {
      name: model.name,
      email: model.email,
      role: model.role,
      ...(model.password ? { password: model.password } : {}),
    };
    return firstValueFrom(this.userService.update(usuario.id, payload));
  }
}
