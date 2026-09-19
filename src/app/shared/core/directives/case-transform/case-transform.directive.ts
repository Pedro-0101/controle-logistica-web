import { Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';

import { toSentenceCase, toTitleCase, toUpperCase } from '@/shared/utils/case';

/**
 * Estratégias de normalização de caixa suportadas pela diretiva `zCase`.
 * - `title`: primeira letra de cada palavra em maiúscula (nomes).
 * - `upper`: tudo em caixa alta (códigos, prefixos e placas).
 * - `sentence`: apenas a primeira letra em maiúscula (texto livre).
 */
export type CaseTransform = 'title' | 'upper' | 'sentence';

/**
 * Normaliza a caixa do valor de um `<input>` ou `<textarea>` aplicando a
 * mesma transformação aos dados do formulário.
 *
 * Para `upper` a transformação é aplicada a cada digitação; para `title` e
 * `sentence` é aplicada ao sair do campo (`blur`), evitando que o cursor
 * salte durante a digitação. Após transformar, dispara um evento `input`
 * para que o formulário (Signal Forms) sincronize o valor normalizado.
 *
 * @example
 * ```html
 * <input z-input [formField]="form.name" zCase="title" />
 * <input z-input [formField]="form.code" zCase="upper" />
 * <textarea z-input [formField]="form.notes" zCase="sentence"></textarea>
 * ```
 */
@Directive({
  selector: 'input[zCase], textarea[zCase]',
})
export class CaseTransformDirective {
  /** Estratégia de caixa aplicada ao valor do campo. */
  readonly zCase = input.required<CaseTransform>();

  private readonly el = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    this.renderer.listen(this.el.nativeElement, 'blur', () => this.applyCase());

    this.renderer.listen(this.el.nativeElement, 'input', () => {
      if (this.zCase() === 'upper') {
        this.applyCase();
      }
    });
  }

  private applyCase(): void {
    const native = this.el.nativeElement;
    if (!native || native.disabled || native.readOnly) return;

    const current = native.value;
    const next = this.transform(current);
    if (next === current) return;

    native.value = next;
    native.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private transform(value: string): string {
    switch (this.zCase()) {
      case 'title':
        return toTitleCase(value);
      case 'upper':
        return toUpperCase(value);
      case 'sentence':
        return toSentenceCase(value);
      default:
        return value;
    }
  }
}
