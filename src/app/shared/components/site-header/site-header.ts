import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { ThemeService } from '@/shared/services/theme.service';
import { ZardButtonComponent } from '@/shared/components/button';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, NgIcon, ZardButtonComponent],
  template: `
    <header class="flex h-14 items-center gap-6 border-b border-border bg-background px-4 sm:px-6">
      <a
        routerLink="/home"
        class="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        aria-label="Ir para a home"
      >
        <ng-icon name="lucideHome" aria-hidden="true" class="size-5" />
        Controle Logística
      </a>

      <nav class="flex items-center gap-1" aria-label="Navegação principal">
        <a z-button zType="ghost" zSize="sm" routerLink="/home" routerLinkActive="bg-accent">Início</a>
      </nav>

      <div class="ml-auto flex items-center gap-1">
        <button
          z-button
          zType="ghost"
          zSize="icon"
          type="button"
          (click)="temaSvc.toggle()"
          [attr.aria-pressed]="temaSvc.isDark()"
          aria-label="Alternar tema"
        >
          <ng-icon [name]="temaSvc.isDark() ? 'lucideSun' : 'lucideMoon'" aria-hidden="true" class="size-4" />
        </button>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly temaSvc = inject(ThemeService);
}
