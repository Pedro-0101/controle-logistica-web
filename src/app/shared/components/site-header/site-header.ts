import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { SessionService } from '@/shared/core/auth';
import { ThemeService } from '@/shared/services/theme.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardNavigationMenuImports } from '@/shared/components/navigation-menu';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, NgIcon, ZardButtonComponent, ZardNavigationMenuImports],
  template: `
    <header class="flex h-14 items-center gap-6 border-b border-border bg-background px-4 sm:px-6">
      <a
        routerLink="/home"
        class="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        aria-label="Ir para a home"
      >
        <ng-icon name="lucideHome" aria-hidden="true" class="size-5" />
        {{ brandName() }}
      </a>

      <nav class="flex items-center gap-1" aria-label="Navegação principal">
        <a z-button zType="ghost" zSize="sm" routerLink="/home" routerLinkActive="bg-accent">Início</a>

        <z-navigation-menu>
          <div z-navigation-menu-list>
            <div z-navigation-menu-item>
              <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="usuariosMenu">
                Usuários
              </button>
              <ng-template #usuariosMenu>
                <div z-navigation-menu-content class="w-56">
                  <a
                    z-navigation-menu-link
                    routerLink="/usuarios"
                    routerLinkActive
                    #linkUsuarios="routerLinkActive"
                    [zActive]="linkUsuarios.isActive"
                  >
                    <ng-icon name="lucideUsers" aria-hidden="true" />
                    Gerenciar usuários
                  </a>
                </div>
              </ng-template>
            </div>

            <div z-navigation-menu-item>
              <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="unidadesMenu">
                Unidades
              </button>
              <ng-template #unidadesMenu>
                <div z-navigation-menu-content class="w-56">
                  <a
                    z-navigation-menu-link
                    routerLink="/unidades"
                    routerLinkActive
                    #linkUnidades="routerLinkActive"
                    [zActive]="linkUnidades.isActive"
                  >
                    <ng-icon name="lucideBuilding2" aria-hidden="true" />
                    Gerenciar unidades
                  </a>
                </div>
              </ng-template>
            </div>

            <div z-navigation-menu-item>
              <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="pontosMenu">
                Pontos
              </button>
              <ng-template #pontosMenu>
                <div z-navigation-menu-content class="w-56">
                  <a
                    z-navigation-menu-link
                    routerLink="/pontos"
                    routerLinkActive
                    #linkPontos="routerLinkActive"
                    [zActive]="linkPontos.isActive"
                  >
                    <ng-icon name="lucideMapPin" aria-hidden="true" />
                    Gerenciar pontos
                  </a>
                </div>
              </ng-template>
            </div>

            @if (isRoot()) {
              <div z-navigation-menu-item>
                <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="empresasMenu">
                  Empresas
                </button>
                <ng-template #empresasMenu>
                  <div z-navigation-menu-content class="w-56">
                    <a
                      z-navigation-menu-link
                      routerLink="/empresas"
                      routerLinkActive
                      #linkEmpresas="routerLinkActive"
                      [zActive]="linkEmpresas.isActive"
                    >
                      <ng-icon name="lucideBuilding" aria-hidden="true" />
                      Gerenciar empresas
                    </a>
                  </div>
                </ng-template>
              </div>
            }
          </div>
        </z-navigation-menu>
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
  private readonly session = inject(SessionService);

  /** `true` quando o usuário logado é root (sem empresa vinculada). */
  protected readonly isRoot = computed(() => this.session.usuario()?.companyId === null);

  /** Nome exibido na marca da navbar (razão social da empresa, quando houver). */
  protected readonly brandName = computed(() => this.session.usuario()?.company?.companyName ?? 'Controle Logística');
}
