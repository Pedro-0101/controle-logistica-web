import { Directive, ElementRef, OnDestroy, Renderer2, computed, effect, inject, input, signal } from '@angular/core';

import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { inputVariants, type ZardInputVariants } from './input.variants';

const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

const EYE_OFF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path><path d="m2 2 20 20"></path></svg>`;

/**
 * Diretiva que estiliza inputs, textareas e selects com o design system do GuardPoint.
 *
 * Basta adicionar o atributo `z-input` a qualquer `<input>`, `<textarea>` ou `<select>`.
 * Todas as propriedades são opcionais e têm valores padrão que não quebram os inputs
 * já existentes no sistema.
 *
 * @example Uso básico
 * ```html
 * <input z-input placeholder="Nome" />
 * ```
 *
 * @example Tamanhos disponíveis
 * ```html
 * <input z-input zSize="sm" placeholder="Pequeno" />
 * <input z-input zSize="default" placeholder="Padrão" />
 * <input z-input zSize="lg" placeholder="Grande" />
 * ```
 *
 * @example Status de validação
 * ```html
 * <input z-input zStatus="error" placeholder="Erro" />
 * <input z-input zStatus="warning" placeholder="Aviso" />
 * <input z-input zStatus="success" placeholder="Sucesso" />
 * ```
 *
 * @example Input sem borda
 * ```html
 * <input z-input zBorderless placeholder="Sem borda" />
 * ```
 *
 * @example Input numérico com spinner
 * ```html
 * <input z-input [zNumeric]="true" [zStep]="5" [zMin]="0" [zMax]="100" placeholder="0-100, passo 5" />
 * ```
 *
 * @example Input com limite de caracteres
 * ```html
 * <input z-input [zMaxlength]="50" placeholder="Máximo 50 caracteres" />
 * ```
 *
 * @example Campo de senha com botão de mostrar/ocultar
 * ```html
 * <input z-input [zPass]="true" [zMinlength]="6" [zMaxlength]="30" placeholder="••••••••" />
 * ```
 *
 * @example Textarea
 * ```html
 * <textarea z-input rows="4" placeholder="Descrição"></textarea>
 * ```
 *
 * @example Combinando com formulários reativos
 * ```html
 * <input z-input formControlName="email" placeholder="seu@email.com" />
 * <input z-input [zNumeric]="true" [zMin]="1" [zMax]="120" formControlName="intervalo" />
 * ```
 */
@Directive({
  selector: 'input[z-input], textarea[z-input], select[z-input]',
  host: {
    '[class]': 'classes()',
  },
  exportAs: 'zInput',
})
export class ZardInputDirective implements OnDestroy {
  /**
   * Exibe o input em estado de erro (borda e anel vermelhos).
   * Mantido para compatibilidade com código existente.
   * Prefira `zStatus="error"` para novos componentes.
   */
  readonly zError = input<ZardInputVariants['zError']>(false);

  /**
   * Classes CSS adicionais mescladas às classes geradas pela diretiva.
   * Útil para ajustes pontuais de largura, margem etc.
   *
   * @example
   * ```html
   * <input z-input class="w-full max-w-sm" placeholder="Largura limitada" />
   * ```
   */
  readonly class = input<ClassValue>('');

  /**
   * Tamanho do input: `default` (médio), `sm` (pequeno) ou `lg` (grande).
   * @default 'default'
   */
  readonly zSize = input<ZardInputVariants['zSize']>('default');

  /**
   * Status visual do input: `error` (vermelho), `warning` (âmbar) ou `success` (verde).
   * Sobrepõe `zError` quando ambos são usados, pois aplica classes no mesmo elemento.
   */
  readonly zStatus = input<ZardInputVariants['zStatus']>(undefined);

  /**
   * Remove a borda e a sombra do input (estilo borderless).
   * @default false
   */
  readonly zBorderless = input<ZardInputVariants['zBorderless']>(false);

  /**
   * Ativa o comportamento de input numérico: define `type="number"` automaticamente
   * e reabilita o spinner nativo (setas de aumentar/diminuir) que é oculto por padrão
   * no design system. Use junto com `zStep`, `zMin` e `zMax` para controlar o intervalo.
   *
   * @default false
   *
   * @example
   * ```html
   * <input z-input [zNumeric]="true" [zStep]="10" [zMin]="0" [zMax]="5000" />
   * ```
   */
  readonly zNumeric = input<boolean>(false);

  /**
   * Incremento/decremento do spinner numérico. Só tem efeito quando `zNumeric` é `true`.
   * @default 1
   */
  readonly zStep = input<number>(1);

  /**
   * Valor mínimo permitido para input numérico. Só tem efeito quando `zNumeric` é `true`.
   */
  readonly zMin = input<number | undefined>(undefined);

  /**
   * Valor máximo permitido para input numérico. Só tem efeito quando `zNumeric` é `true`.
   */
  readonly zMax = input<number | undefined>(undefined);

  /**
   * Número máximo de caracteres permitidos (atributo `maxlength` nativo).
   * Funciona para qualquer input de texto, independente de `zNumeric`.
   *
   * @example
   * ```html
   * <input z-input [zMaxlength]="100" placeholder="Máximo 100 caracteres" />
   * ```
   */
  readonly zMaxlength = input<number | undefined>(undefined);

  /**
   * Número mínimo de caracteres exigidos (atributo `minlength` nativo).
   * Funciona para qualquer input de texto, independente de `zNumeric`.
   *
   * @example
   * ```html
   * <input z-input [zMinlength]="6" placeholder="Mínimo 6 caracteres" />
   * ```
   */
  readonly zMinlength = input<number | undefined>(undefined);

  /**
   * Ativa o modo de campo de senha: força `type="password"` e adiciona um botão
   * para mostrar/ocultar os caracteres digitados. Combine com `zMinlength` e
   * `zMaxlength` para aplicar as regras de tamanho da senha.
   *
   * @default false
   *
   * @example
   * ```html
   * <input z-input [zPass]="true" [zMinlength]="6" [zMaxlength]="30" />
   * ```
   */
  readonly zPass = input<boolean>(false);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly unlisteners: (() => void)[] = [];
  private wheelUnlistener: (() => void) | null = null;
  private readonly showPassword = signal(false);
  private passwordToggleButton: HTMLButtonElement | null = null;
  private passwordWrapped = false;

  constructor() {
    effect(() => {
      const native = this.el.nativeElement;
      if (this.zNumeric() && native instanceof HTMLInputElement) {
        this.renderer.setAttribute(native, 'type', 'number');
        this.renderer.setAttribute(native, 'step', String(this.zStep()));
        if (this.zMin() !== undefined) {
          this.renderer.setAttribute(native, 'min', String(this.zMin()));
        }
        if (this.zMax() !== undefined) {
          this.renderer.setAttribute(native, 'max', String(this.zMax()));
        }
      }
    });

    effect(() => {
      const maxlength = this.zMaxlength();
      if (maxlength !== undefined && maxlength !== null) {
        this.renderer.setAttribute(this.el.nativeElement, 'maxlength', String(maxlength));
      }
    });

    effect(() => {
      const minlength = this.zMinlength();
      if (minlength !== undefined && minlength !== null) {
        this.renderer.setAttribute(this.el.nativeElement, 'minlength', String(minlength));
      }
    });

    effect(() => {
      const native = this.el.nativeElement;
      if (!this.zPass() || !(native instanceof HTMLInputElement)) return;

      this.renderer.setAttribute(native, 'type', this.showPassword() ? 'text' : 'password');
      this.ensurePasswordToggle(native);
      this.updatePasswordToggleIcon();
    });

    effect(() => {
      if (this.wheelUnlistener) {
        this.wheelUnlistener();
        this.wheelUnlistener = null;
      }

      if (this.zNumeric()) {
        const native = this.el.nativeElement;
        const handler = (event: WheelEvent) => this.onWheel(event);
        native.addEventListener('wheel', handler, { passive: false });
        this.wheelUnlistener = () => native.removeEventListener('wheel', handler);
      }
    });

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'blur', () => this.clampAndShake()),
    );

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'change', () => this.clampAndShake()),
    );

    this.unlisteners.push(
      this.renderer.listen(this.el.nativeElement, 'keydown', (event: KeyboardEvent) => this.onKeydown(event)),
    );
  }

  ngOnDestroy(): void {
    if (this.wheelUnlistener) {
      this.wheelUnlistener();
      this.wheelUnlistener = null;
    }
    for (const unlisten of this.unlisteners) {
      unlisten();
    }
  }

  private onKeydown(event: KeyboardEvent): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const min = this.zMin();
    const max = this.zMax();
    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    if (event.key === 'ArrowUp' && max !== undefined && value >= max) {
      event.preventDefault();
      this.shake();
    }
    if (event.key === 'ArrowDown' && min !== undefined && value <= min) {
      event.preventDefault();
      this.shake();
    }
  }

  private onWheel(event: WheelEvent): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const min = this.zMin();
    const max = this.zMax();
    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    if (event.deltaY < 0 && min !== undefined && value <= min) {
      event.preventDefault();
      this.shake();
    }
    if (event.deltaY > 0 && max !== undefined && value >= max) {
      event.preventDefault();
      this.shake();
    }
  }

  private clampAndShake(): void {
    if (!this.zNumeric()) return;
    const native = this.el.nativeElement;
    if (!(native instanceof HTMLInputElement)) return;

    const value = parseFloat(native.value);
    if (isNaN(value)) return;

    const min = this.zMin();
    const max = this.zMax();

    let clamped = false;
    if (min !== undefined && value < min) {
      native.value = String(min);
      clamped = true;
    } else if (max !== undefined && value > max) {
      native.value = String(max);
      clamped = true;
    }

    if (clamped) {
      native.dispatchEvent(new Event('input', { bubbles: true }));
      this.shake();
    }
  }

  private ensurePasswordToggle(native: HTMLInputElement): void {
    if (this.passwordWrapped) return;
    const parent = this.renderer.parentNode(native);
    if (!parent) return;
    this.passwordWrapped = true;

    const wrapper = this.renderer.createElement('div');
    this.renderer.addClass(wrapper, 'relative');
    this.renderer.insertBefore(parent, wrapper, native);
    this.renderer.removeChild(parent, native);
    this.renderer.appendChild(wrapper, native);

    const button = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(button, 'type', 'button');
    this.renderer.setAttribute(button, 'tabindex', '-1');
    this.renderer.setAttribute(
      button,
      'class',
      'absolute right-1 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50',
    );

    this.unlisteners.push(
      this.renderer.listen(button, 'click', (event: Event) => {
        event.preventDefault();
        this.showPassword.set(!this.showPassword());
      }),
    );

    this.renderer.appendChild(wrapper, button);
    this.passwordToggleButton = button;
  }

  private updatePasswordToggleIcon(): void {
    if (!this.passwordToggleButton) return;
    const revealed = this.showPassword();
    this.renderer.setProperty(this.passwordToggleButton, 'innerHTML', revealed ? EYE_OFF_ICON : EYE_ICON);
    this.renderer.setAttribute(this.passwordToggleButton, 'aria-label', revealed ? 'Ocultar senha' : 'Mostrar senha');
  }

  private shake(): void {
    const native = this.el.nativeElement;
    this.renderer.addClass(native, 'shake');
    setTimeout(() => {
      this.renderer.removeClass(native, 'shake');
    }, 400);
  }

  protected readonly classes = computed(() =>
    mergeClasses(
      inputVariants({
        zSize: this.zSize(),
        zStatus: this.zStatus(),
        zBorderless: this.zBorderless(),
        zError: this.zError(),
        zNumeric: this.zNumeric(),
        zPass: this.zPass(),
      }),
      this.class(),
    ),
  );
}
