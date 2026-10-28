import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import type {
  CompanyNotificationSettings,
  NotificationAvailableFilters,
  NotificationEventDefinition,
  NotificationEventType,
  NotificationFilters,
  NotificationPreferences,
  NotificationPreferenceItem,
  UpdateCompanyNotificationSettingsRequest,
  UpdateNotificationPreferencesRequest,
} from '@/shared/models';
import { SessionService } from '@/shared/core/auth';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { NotificationFiltersEditor } from '@/shared/components/notification-filters-editor/notification-filters-editor';
import { NotificationCenterService } from '@/shared/services/notification-center.service';
import { NotificationService } from '@/shared/services/notification.service';

interface UserEventDraft {
  definition: NotificationEventDefinition;
  eventType: NotificationEventType;
  enabled: boolean;
  filters: NotificationFilters;
  inherit: boolean;
  canOverride: boolean;
  source: NotificationPreferenceItem['source'];
}

interface CompanyEventDraft {
  definition: NotificationEventDefinition;
  eventType: NotificationEventType;
  enabled: boolean;
  filters: NotificationFilters;
  allowUserOverride: boolean;
}

const EMPTY_FILTERS: NotificationAvailableFilters = { points: [], cameras: [] };

@Component({
  selector: 'app-notification-settings',
  imports: [
    RouterLink,
    SiteHeader,
    NgIcon,
    ZardButtonComponent,
    ZardCardComponent,
    ZardSwitchComponent,
    NotificationFiltersEditor,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Configurações de notificações</h1>
        <p class="text-sm text-muted-foreground">
          Escolha quais eventos notificar e refine por ponto, câmera e resultado.
        </p>
      </div>

      @if (carregando()) {
        <z-card>
          <div class="px-4 py-16 text-center text-sm text-muted-foreground">Carregando...</div>
        </z-card>
      } @else {
        <z-card>
          <div class="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div class="flex flex-col gap-0.5">
              <h2 class="text-sm font-semibold">Minhas notificações</h2>
              <p class="text-xs text-muted-foreground">
                Quando não há personalização, o padrão da empresa é aplicado.
              </p>
            </div>
            <button
              z-button
              zType="default"
              zSize="sm"
              [zLoading]="salvandoUsuario()"
              (click)="salvarUsuario()"
            >
              Salvar minhas preferências
            </button>
          </div>

          <div class="divide-y">
            @for (draft of userDrafts(); track draft.eventType) {
              <details class="group">
                <summary
                  class="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 hover:bg-accent/40"
                >
                  <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {{ draft.definition.label }}
                      <span class="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {{ sourceLabel(draft.source) }}
                      </span>
                    </span>
                    <span class="text-xs text-muted-foreground">{{ draft.definition.description }}</span>
                  </div>

                  @if (draft.canOverride) {
                    <label class="flex items-center gap-2 text-xs text-muted-foreground">
                      <z-switch
                        [checked]="draft.enabled"
                        [zDisabled]="draft.inherit"
                        (checkedChange)="setUserEnabled(draft.eventType, $event)"
                      />
                      Receber
                    </label>

                    @if (companyId()) {
                      <label class="flex items-center gap-2 text-xs text-muted-foreground">
                        <z-switch
                          [checked]="draft.inherit"
                          (checkedChange)="setUserInherit(draft.eventType, $event)"
                        />
                        Usar padrão da empresa
                      </label>
                    }
                  } @else {
                    <span class="text-xs text-muted-foreground">Definido pela empresa</span>
                  }

                  <ng-icon
                    name="lucideChevronDown"
                    aria-hidden="true"
                    class="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>

                <div class="border-t bg-muted/20 px-4 py-4">
                  <app-notification-filters-editor
                    [zFilters]="draft.definition.filters"
                    [zAvailable]="availableFilters()"
                    [zValue]="draft.filters"
                    [zDisabled]="draft.inherit || !draft.canOverride"
                    (zValueChange)="setUserFilters(draft.eventType, $event)"
                  />
                </div>
              </details>
            }
          </div>
        </z-card>

        @if (isAdmin() && companyId()) {
          <z-card>
            <div class="flex flex-wrap items-center justify-between gap-2 border-b p-4">
              <div class="flex flex-col gap-0.5">
                <h2 class="text-sm font-semibold">Padrões da empresa</h2>
                <p class="text-xs text-muted-foreground">
                  Aplicados a todos os usuários que não personalizarem o evento.
                </p>
              </div>
              <button
                z-button
                zType="outline"
                zSize="sm"
                [zLoading]="salvandoEmpresa()"
                (click)="salvarEmpresa()"
              >
                Salvar padrões da empresa
              </button>
            </div>

            @if (carregandoEmpresa()) {
              <div class="px-4 py-10 text-center text-sm text-muted-foreground">Carregando...</div>
            } @else {
              <div class="divide-y">
                @for (draft of companyDrafts(); track draft.eventType) {
                  <details class="group">
                    <summary
                      class="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 hover:bg-accent/40"
                    >
                      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="text-sm font-medium">{{ draft.definition.label }}</span>
                        <span class="text-xs text-muted-foreground">{{ draft.definition.description }}</span>
                      </div>

                      <label class="flex items-center gap-2 text-xs text-muted-foreground">
                        <z-switch
                          [checked]="draft.enabled"
                          (checkedChange)="setCompanyEnabled(draft.eventType, $event)"
                        />
                        Ativo
                      </label>

                      <label class="flex items-center gap-2 text-xs text-muted-foreground">
                        <z-switch
                          [checked]="draft.allowUserOverride"
                          (checkedChange)="setCompanyAllowOverride(draft.eventType, $event)"
                        />
                        Permitir personalização
                      </label>

                      <ng-icon
                        name="lucideChevronDown"
                        aria-hidden="true"
                        class="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                      />
                    </summary>

                    <div class="border-t bg-muted/20 px-4 py-4">
                      <app-notification-filters-editor
                        [zFilters]="draft.definition.filters"
                        [zAvailable]="availableFilters()"
                        [zValue]="draft.filters"
                        (zValueChange)="setCompanyFilters(draft.eventType, $event)"
                      />
                    </div>
                  </details>
                }
              </div>
            }
          </z-card>
        }
      }

      <div class="flex justify-between">
        <a z-button zType="ghost" routerLink="/notificacoes">
          <ng-icon name="lucideArrowLeft" aria-hidden="true" />
          Voltar para notificações
        </a>
      </div>
    </main>
  `,
})
export class NotificationSettings implements OnInit {
  private readonly api = inject(NotificationService);
  private readonly center = inject(NotificationCenterService);
  private readonly session = inject(SessionService);

  protected readonly carregando = signal(true);
  protected readonly carregandoEmpresa = signal(false);
  protected readonly salvandoUsuario = signal(false);
  protected readonly salvandoEmpresa = signal(false);

  protected readonly userDrafts = signal<UserEventDraft[]>([]);
  protected readonly companyDrafts = signal<CompanyEventDraft[]>([]);
  protected readonly availableFilters = signal<NotificationAvailableFilters>(EMPTY_FILTERS);

  protected readonly isAdmin = computed(() => this.session.usuario()?.role === 'admin');
  protected readonly companyId = computed(() => this.session.usuario()?.companyId ?? null);

  ngOnInit(): void {
    this.api.catalog().subscribe({
      next: (catalog) => {
        this.api.preferences().subscribe({
          next: (preferences) => {
            this.availableFilters.set(preferences.availableFilters);
            this.userDrafts.set(this.buildUserDrafts(catalog.events, preferences));
            this.carregando.set(false);
            this.carregarEmpresa();
          },
          error: () => {
            this.carregando.set(false);
            toast.error('Não foi possível carregar suas preferências.');
          },
        });
      },
      error: () => {
        this.carregando.set(false);
        toast.error('Não foi possível carregar o catálogo de notificações.');
      },
    });
  }

  protected sourceLabel(source: NotificationPreferenceItem['source']): string {
    if (source === 'user') return 'Personalizado';
    if (source === 'company') return 'Padrão da empresa';
    return 'Padrão do sistema';
  }

  protected setUserEnabled(eventType: NotificationEventType, enabled: boolean): void {
    this.userDrafts.update((drafts) =>
      drafts.map((draft) => (draft.eventType === eventType ? { ...draft, enabled } : draft)),
    );
  }

  protected setUserInherit(eventType: NotificationEventType, inherit: boolean): void {
    this.userDrafts.update((drafts) =>
      drafts.map((draft) => (draft.eventType === eventType ? { ...draft, inherit } : draft)),
    );
  }

  protected setUserFilters(eventType: NotificationEventType, filters: NotificationFilters): void {
    this.userDrafts.update((drafts) =>
      drafts.map((draft) => (draft.eventType === eventType ? { ...draft, filters } : draft)),
    );
  }

  protected setCompanyEnabled(eventType: NotificationEventType, enabled: boolean): void {
    this.companyDrafts.update((drafts) =>
      drafts.map((draft) => (draft.eventType === eventType ? { ...draft, enabled } : draft)),
    );
  }

  protected setCompanyAllowOverride(eventType: NotificationEventType, allow: boolean): void {
    this.companyDrafts.update((drafts) =>
      drafts.map((draft) =>
        draft.eventType === eventType ? { ...draft, allowUserOverride: allow } : draft,
      ),
    );
  }

  protected setCompanyFilters(eventType: NotificationEventType, filters: NotificationFilters): void {
    this.companyDrafts.update((drafts) =>
      drafts.map((draft) => (draft.eventType === eventType ? { ...draft, filters } : draft)),
    );
  }

  protected salvarUsuario(): void {
    const editable = this.userDrafts().filter((draft) => draft.canOverride);
    if (editable.length === 0) {
      toast.info('Sua empresa não permite personalizar as notificações.');
      return;
    }

    const items: UpdateNotificationPreferencesRequest['items'] = editable.map((draft) =>
      draft.inherit
        ? { eventType: draft.eventType, enabled: null, filters: null }
        : {
            eventType: draft.eventType,
            enabled: draft.enabled,
            filters: draft.filters,
          },
    );

    this.salvandoUsuario.set(true);
    this.api.updatePreferences({ items }).subscribe({
      next: (preferences) => {
        const catalog = this.userDrafts().map((draft) => draft.definition);
        this.userDrafts.set(this.buildUserDrafts(catalog, preferences));
        this.salvandoUsuario.set(false);
        this.center.refreshUnread();
        this.center.refreshRecent();
        toast.success('Preferências salvas.');
      },
      error: () => {
        this.salvandoUsuario.set(false);
        toast.error('Não foi possível salvar suas preferências.');
      },
    });
  }

  protected salvarEmpresa(): void {
    const companyId = this.companyId();
    if (!companyId) return;

    const items: UpdateCompanyNotificationSettingsRequest['items'] = this.companyDrafts().map(
      (draft) => ({
        eventType: draft.eventType,
        enabled: draft.enabled,
        defaultFilters: draft.filters,
        allowUserOverride: draft.allowUserOverride,
      }),
    );

    this.salvandoEmpresa.set(true);
    this.api.updateCompanySettings(companyId, { items }).subscribe({
      next: (settings) => {
        this.companyDrafts.set(this.buildCompanyDrafts(settings));
        this.salvandoEmpresa.set(false);
        this.recarregarPreferencias();
        toast.success('Padrões da empresa salvos.');
      },
      error: () => {
        this.salvandoEmpresa.set(false);
        toast.error('Não foi possível salvar os padrões da empresa.');
      },
    });
  }

  private carregarEmpresa(): void {
    const companyId = this.companyId();
    if (!this.isAdmin() || !companyId) return;

    this.carregandoEmpresa.set(true);
    this.api.companySettings(companyId).subscribe({
      next: (settings) => {
        this.companyDrafts.set(this.buildCompanyDrafts(settings));
        this.carregandoEmpresa.set(false);
      },
      error: () => {
        this.carregandoEmpresa.set(false);
        toast.error('Não foi possível carregar os padrões da empresa.');
      },
    });
  }

  private recarregarPreferencias(): void {
    this.api.preferences().subscribe({
      next: (preferences) => {
        const catalog = this.userDrafts().map((draft) => draft.definition);
        this.userDrafts.set(this.buildUserDrafts(catalog, preferences));
      },
    });
  }

  private buildUserDrafts(
    catalog: NotificationEventDefinition[],
    preferences: NotificationPreferences,
  ): UserEventDraft[] {
    const definitions = new Map(catalog.map((definition) => [definition.type, definition]));
    return preferences.events.flatMap((preference) => {
      const definition = definitions.get(preference.eventType);
      if (!definition) return [];

      const canOverride = preference.company ? preference.company.allowUserOverride : true;
      const inherit = this.companyId() !== null && canOverride && preference.override === null;

      return [
        {
          definition,
          eventType: preference.eventType,
          enabled: preference.override?.enabled ?? preference.enabled,
          filters: preference.override?.filters ?? preference.filters,
          inherit,
          canOverride,
          source: preference.source,
        },
      ];
    });
  }

  private buildCompanyDrafts(settings: CompanyNotificationSettings): CompanyEventDraft[] {
    const known = new Map(
      this.userDrafts().map((draft) => [draft.eventType, draft.definition] as const),
    );

    return settings.events.map((item) => {
      const definition =
        known.get(item.eventType) ??
        ({
          type: item.eventType,
          label: item.eventType,
          description: '',
          defaultEnabled: item.enabled,
          defaultFilters: item.defaultFilters ?? {},
          dedupeWindowSeconds: 0,
          filters: [],
        } satisfies NotificationEventDefinition);

      return {
        definition,
        eventType: item.eventType,
        enabled: item.enabled,
        filters: item.defaultFilters ?? {},
        allowUserOverride: item.allowUserOverride,
      };
    });
  }
}
