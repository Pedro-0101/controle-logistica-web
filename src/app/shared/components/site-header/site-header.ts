import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { SessionService } from '@/shared/core/auth';
import { ThemeService } from '@/shared/services/theme.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardNavigationMenuImports } from '@/shared/components/navigation-menu';

@Component({
  selector: 'app-site-header',
  host: {
    '(document:click)': 'menuAberto.set(false)',
  },
  imports: [RouterLink, RouterLinkActive, NgIcon, ZardButtonComponent, ZardNavigationMenuImports],
  template: `
    <header class="flex h-14 items-center gap-6 border-b border-border bg-background px-4 sm:px-6">
      <a
        [routerLink]="rotaInicial()"
        class="flex items-center gap-2 font-semibold tracking-tight text-foreground"
        aria-label="Ir para a tela principal"
      >
        <ng-icon name="lucideHome" aria-hidden="true" class="size-5" />
        {{ brandName() }}
      </a>

      <nav class="flex items-center gap-1" aria-label="Navegação principal">
        @if (!isRoot()) {
          <a
            z-button
            zType="ghost"
            zSize="sm"
            routerLink="/home"
            routerLinkActive="bg-accent"
            >Início</a
          >

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

              <div z-navigation-menu-item>
                <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="veiculosMenu">
                  Veículos
                </button>
                <ng-template #veiculosMenu>
                  <div z-navigation-menu-content class="w-56">
                    <a
                      z-navigation-menu-link
                      routerLink="/veiculos"
                      routerLinkActive
                      #linkVeiculos="routerLinkActive"
                      [zActive]="linkVeiculos.isActive"
                    >
                      <ng-icon name="lucideCar" aria-hidden="true" />
                      Gerenciar veículos
                    </a>
                  </div>
                </ng-template>
              </div>

              <div z-navigation-menu-item>
                <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="movimentosMenu">
                  Movimentações
                </button>
                <ng-template #movimentosMenu>
                  <div z-navigation-menu-content class="w-56">
                    <a
                      z-navigation-menu-link
                      routerLink="/movimentos/pendentes"
                      routerLinkActive
                      #linkPendentes="routerLinkActive"
                      [zActive]="linkPendentes.isActive"
                    >
                      <ng-icon name="lucideInbox" aria-hidden="true" />
                      Revisão pendente
                    </a>
                  </div>
                </ng-template>
              </div>

              <div z-navigation-menu-item>
                <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="camerasMenu">
                  Câmeras
                </button>
                <ng-template #camerasMenu>
                  <div z-navigation-menu-content class="w-56">
                    <a
                      z-navigation-menu-link
                      routerLink="/cameras/monitoramento"
                      routerLinkActive
                      #linkMonitoramento="routerLinkActive"
                      [zActive]="linkMonitoramento.isActive"
                    >
                      <ng-icon name="lucideMonitorPlay" aria-hidden="true" />
                      Monitoramento
                    </a>
                    <a
                      z-navigation-menu-link
                      routerLink="/cameras"
                      routerLinkActive
                      #linkCameras="routerLinkActive"
                      [zActive]="linkCameras.isActive"
                    >
                      <ng-icon name="lucideCamera" aria-hidden="true" />
                      Gerenciar câmeras
                    </a>
                  </div>
                </ng-template>
              </div>

              @if (isAdmin()) {
                <a
                  z-button
                  zType="ghost"
                  zSize="sm"
                  routerLink="/minha-empresa"
                  routerLinkActive="bg-accent"
                >
                  Minha Empresa
                </a>
              }
            </div>
          </z-navigation-menu>
        } @else {
          <z-navigation-menu>
            <div z-navigation-menu-list>
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

              <div z-navigation-menu-item>
                <button z-navigation-menu-trigger [zNavigationMenuTriggerFor]="anprMenu">
                  Integrações
                </button>
                <ng-template #anprMenu>
                  <div z-navigation-menu-content class="w-56">
                    <a
                      z-navigation-menu-link
                      routerLink="/anpr/uso-externo"
                      routerLinkActive
                      #linkUsoExterno="routerLinkActive"
                      [zActive]="linkUsoExterno.isActive"
                    >
                      <ng-icon name="lucideActivity" aria-hidden="true" />
                      Uso de APIs externas
                    </a>
                  </div>
                </ng-template>
              </div>
            </div>
          </z-navigation-menu>
        }
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
          <ng-icon
            [name]="temaSvc.isDark() ? 'lucideSun' : 'lucideMoon'"
            aria-hidden="true"
            class="size-4"
          />
        </button>

        <div class="relative">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            (click)="menuAberto.update((v) => !v); $event.stopPropagation()"
            [attr.aria-expanded]="menuAberto()"
            aria-haspopup="true"
            aria-label="Menu do usuário"
          >
            <ng-icon name="lucideUser" aria-hidden="true" class="size-4" />
            <span class="hidden sm:inline">{{ userName() }}</span>
            <ng-icon name="lucideChevronDown" aria-hidden="true" class="size-3" />
          </button>

          @if (menuAberto()) {
            <div
              class="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              role="menu"
            >
              <div class="px-2 py-1.5">
                <div class="text-sm font-medium text-foreground">{{ userName() }}</div>
                <div class="text-xs text-muted-foreground">{{ userEmail() }}</div>
              </div>
              <div class="my-1 border-t border-border"></div>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                role="menuitem"
                (click)="fazerLogout()"
              >
                <ng-icon name="lucideLogOut" aria-hidden="true" class="size-4" />
                Sair da conta
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly temaSvc = inject(ThemeService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly menuAberto = signal(false);

  protected readonly isRoot = computed(() => this.session.usuario()?.companyId === null);
  protected readonly isAdmin = computed(() => this.session.usuario()?.role === 'admin');
  protected readonly rotaInicial = computed(() => (this.isRoot() ? '/empresas' : '/home'));
  protected readonly brandName = computed(
    () => this.session.usuario()?.company?.companyName ?? 'Controle Logística',
  );
  protected readonly userName = computed(
    () => this.session.usuario()?.name ?? this.session.usuario()?.email ?? 'Usuário',
  );
  protected readonly userEmail = computed(() => this.session.usuario()?.email ?? '');

  protected fazerLogout(): void {
    this.menuAberto.set(false);
    this.session.logout();
    void this.router.navigate(['/login']);
  }
}
