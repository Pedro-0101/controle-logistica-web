import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import type { FieldState } from '@angular/forms/signals';
import { firstValueFrom, take } from 'rxjs';
import { toast } from 'ngx-sonner';

import type { ApiError, LoginRequest } from '@/shared/models';
import { LoggerService } from '@/shared/services/logger.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDialogService } from '@/shared/components/dialog';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@/shared/components/form';
import { ZardInputDirective } from '@/shared/components/input';
import { SessionService } from '@/shared/core/auth';
import { AuthService } from '@/shared/services/auth.service';
import { AuthTokenService, type RememberedUser } from '@/shared/services/auth-token.service';
import { LoginSavedAccountDialog } from './saved-account-dialog';

interface LoginModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  imports: [
    FormRoot,
    FormField,
    ZardButtonComponent,
    ZardCardComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardFormMessageComponent,
    ZardInputDirective,
    ZardCheckboxComponent,
  ],
  template: `
    <main class="flex min-h-svh w-full">
      <section
        class="flex w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2"
        aria-label="Área de autenticação"
      >
        <div class="w-full max-w-sm">
          <header class="mb-8 space-y-2 text-center">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">Acessar conta</h1>
            <p class="text-sm text-muted-foreground">Informe suas credenciais para continuar.</p>
          </header>

          <z-card>
            <form [formRoot]="loginForm" class="space-y-4 p-6" novalidate>
              <z-form-field>
                <z-form-label [zRequired]="true" for="email">E-mail</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="email"
                    type="email"
                    [formField]="loginForm.email"
                    autocomplete="email"
                    inputmode="email"
                    placeholder="seu@email.com"
                    [attr.aria-invalid]="loginForm.email().invalid() && loginForm.email().touched()"
                    [attr.aria-describedby]="loginForm.email().errors().length ? 'email-error' : null"
                  />
                </z-form-control>
                @if (loginForm.email().invalid() && loginForm.email().touched()) {
                  <z-form-message id="email-error" [zError]="true">
                    {{ firstError(loginForm.email()) }}
                  </z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <z-form-label [zRequired]="true" for="password">Senha</z-form-label>
                <z-form-control>
                  <input
                    z-input
                    id="password"
                    [zPass]="true"
                    [formField]="loginForm.password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    [attr.aria-invalid]="loginForm.password().invalid() && loginForm.password().touched()"
                    [attr.aria-describedby]="loginForm.password().errors().length ? 'password-error' : null"
                  />
                </z-form-control>
                @if (loginForm.password().invalid() && loginForm.password().touched()) {
                  <z-form-message id="password-error" [zError]="true">
                    {{ firstError(loginForm.password()) }}
                  </z-form-message>
                }
              </z-form-field>

              <div class="flex items-center">
                <label class="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                  <z-checkbox [(checked)]="rememberLogin" />
                  Lembrar de mim
                </label>
              </div>

              <button
                z-button
                zType="default"
                zSize="default"
                [zFull]="true"
                [zLoading]="submitting()"
                [zDisabled]="loginForm().invalid()"
                type="submit"
              >
                Entrar
              </button>
            </form>
          </z-card>
        </div>
      </section>

      <aside class="hidden w-1/2 bg-primary lg:block" aria-hidden="true"></aside>
    </main>
  `,
})
export class Login implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authTokenService = inject(AuthTokenService);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(ZardDialogService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly logger = inject(LoggerService).create('Login');

  protected readonly submitting = signal(false);

  /** Mantém a sessão ativa entre reaberturas do navegador. */
  protected readonly rememberLogin = signal(true);

  private readonly model = signal<LoginModel>({ email: '', password: '' });

  ngOnInit(): void {
    this.promptSavedAccount();
  }

  /**
   * Pergunta se o usuário deseja entrar com a conta salva no dispositivo
   * ("lembrar de mim"), exibindo um dialog antes do formulário de login.
   */
  private promptSavedAccount(): void {
    const account = this.authTokenService.rememberedUser();
    if (!account) return;

    this.logger.info('Exibindo dialog de conta salva', { email: account.email });

    const dialogRef = this.dialog.create<LoginSavedAccountDialog, RememberedUser>({
      zContent: LoginSavedAccountDialog,
      zData: account,
      zViewContainerRef: this.viewContainerRef,
      zTitle: 'Entrar novamente?',
      zDescription: 'Há uma conta salva neste dispositivo. Deseja entrar com ela?',
      zClosable: false,
      zMaskClosable: false,
      zHideFooter: true,
      zWidth: '24rem',
    });

    dialogRef.afterClosed.pipe(take(1)).subscribe(async (useSavedAccount) => {
      if (useSavedAccount === true) {
        this.logger.info('Usuário optou por entrar com a conta salva', { email: account.email });
        await this.enterWithSavedAccount();
      } else {
        this.logger.info('Usuário optou por usar outra conta', { email: account.email });
      }
    });
  }

  /** Entra na conta salva, restaurando a sessão a partir do token persistido. */
  private async enterWithSavedAccount(): Promise<void> {
    try {
      const restored = await this.session.carregar();
      if (!restored) {
        throw new Error('Sessão restaurada inválida');
      }
      this.logger.info('Sessão restaurada com conta salva', { email: this.session.usuario()?.email });
      toast.success('Sessão restaurada com sucesso.');
      void this.router.navigate(['/']);
    } catch (error) {
      this.logger.error('Falha ao restaurar sessão salva', error);
      this.session.logout();
      toast.error('A sessão salva expirou. Entre novamente.');
    }
  }

  protected readonly loginForm = form(
    this.model,
    (fields) => {
      required(fields.email, { message: 'Informe o e-mail.' });
      email(fields.email, { message: 'E-mail inválido.' });
      required(fields.password, { message: 'Informe a senha.' });
    },
    {
      submission: {
        action: async () => {
          this.submitting.set(true);
          const model = this.model();
          this.logger.info('Tentativa de login', { email: model.email });

          const credentials: LoginRequest = {
            email: model.email,
            password: model.password,
          };

          try {
            const result = await firstValueFrom(this.authService.login(credentials, this.rememberLogin()));
            this.session.defineUsuario(result.user);
            this.logger.info('Login concluído');
            toast.success('Login realizado com sucesso.');
            void this.router.navigate(['/']);
          } catch (error) {
            this.logger.error('Falha ao autenticar', error);
            const message = (error as ApiError).message || 'Falha ao entrar na conta.';
            toast.error(message);
          } finally {
            this.submitting.set(false);
          }
        },
      },
    },
  );

  protected firstError(field: FieldState<string, string>): string {
    const errors = field.errors();
    return errors.length ? errors[0].message ?? 'Valor inválido.' : '';
  }
}
