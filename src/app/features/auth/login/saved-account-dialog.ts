import { Component, afterNextRender, inject, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDialogRef, Z_MODAL_DATA } from '@/shared/components/dialog';
import type { RememberedUser } from '@/shared/services/auth-token.service';

@Component({
  selector: 'app-login-saved-account-dialog',
  imports: [ZardButtonComponent, NgIcon],
  template: `
    <div class="flex flex-col items-center gap-5 py-2 text-center">
      <div class="flex flex-col items-center gap-3">
        <span class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ng-icon name="lucideUser" aria-hidden="true" class="size-6" />
        </span>
        <div class="space-y-0.5">
          <p class="text-sm font-semibold text-foreground">{{ account.name }}</p>
          <p class="text-sm text-muted-foreground">{{ account.email }}</p>
        </div>
      </div>

      <div class="flex w-full flex-col gap-2">
        <button #enterButton z-button zType="default" zSize="default" [zFull]="true" (click)="enter()">
          Entrar
        </button>
        <button z-button zType="outline" zSize="default" [zFull]="true" (click)="useAnother()">
          Usar outra conta
        </button>
      </div>
    </div>
  `,
})
export class LoginSavedAccountDialog {
  private readonly dialogRef = inject(ZardDialogRef<LoginSavedAccountDialog, boolean>);
  private readonly data = inject<RememberedUser>(Z_MODAL_DATA);
  private readonly enterButton = viewChild<ElementRef<HTMLButtonElement>>('enterButton');

  protected readonly account = this.data;

  constructor() {
    afterNextRender(() => {
      this.enterButton()?.nativeElement.focus();
    });
  }

  enter(): void {
    this.dialogRef.close(true);
  }

  useAnother(): void {
    this.dialogRef.close(false);
  }
}
