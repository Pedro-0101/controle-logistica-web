import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import type {
  NotificationEventType,
  NotificationFiltersQuery,
  NotificationItem,
  NotificationSeverity,
} from '@/shared/models';
import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardEmptyComponent } from '@/shared/components/empty';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { ZardSelectImports } from '@/shared/components/select';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { NotificationCenterService } from '@/shared/services/notification-center.service';
import { NotificationService } from '@/shared/services/notification.service';
import {
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_SEVERITY_BADGE_CLASS,
  NOTIFICATION_SEVERITY_LABELS,
  NOTIFICATION_SEVERITY_DOT_CLASS,
  formatNotificationTime,
  notificationEventLabel,
  notificationSeverityLabel,
} from '@/shared/utils/notification-display';

const PAGE_SIZE = 20;
const EVENT_OPTIONS = Object.entries(NOTIFICATION_EVENT_LABELS) as Array<
  [NotificationEventType, string]
>;
const SEVERITY_OPTIONS = Object.entries(NOTIFICATION_SEVERITY_LABELS) as Array<
  [NotificationSeverity, string]
>;

@Component({
  selector: 'app-notifications',
  imports: [
    RouterLink,
    SiteHeader,
    NgIcon,
    ZardButtonComponent,
    ZardCardComponent,
    ZardEmptyComponent,
    ZardPaginationComponent,
    ZardSelectImports,
    ZardSwitchComponent,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Notificações</h1>
        <p class="text-sm text-muted-foreground">
          Acompanhe movimentos, erros de câmera, chamadas externas e alertas do sistema.
        </p>
      </div>

      <z-card>
        <div class="flex flex-wrap items-center gap-3 border-b p-4">
          <z-select
            [zValue]="evento()"
            (zSelectionChange)="onEventoChange($event)"
            zPlaceholder="Todos os eventos"
            class="w-48"
          >
            <z-select-item zValue="">Todos os eventos</z-select-item>
            @for (option of eventos; track option[0]) {
              <z-select-item [zValue]="option[0]">{{ option[1] }}</z-select-item>
            }
          </z-select>

          <z-select
            [zValue]="severidade()"
            (zSelectionChange)="onSeveridadeChange($event)"
            zPlaceholder="Todas as severidades"
            class="w-48"
          >
            <z-select-item zValue="">Todas as severidades</z-select-item>
            @for (option of severidades; track option[0]) {
              <z-select-item [zValue]="option[0]">{{ option[1] }}</z-select-item>
            }
          </z-select>

          <label class="flex items-center gap-2 text-sm text-muted-foreground">
            <z-switch [checked]="somenteNaoLidas()" (checkedChange)="onNaoLidasChange($event)" />
            Somente não lidas
          </label>

          <div class="ml-auto flex items-center gap-2">
            @if (naoLidas() > 0) {
              <button z-button zType="outline" zSize="sm" (click)="marcarTodas()">
                <ng-icon name="lucideCheckCircle" aria-hidden="true" />
                Marcar todas
              </button>
            }
            <button z-button zType="ghost" zSize="icon" [zLoading]="carregando()" (click)="carregar()" aria-label="Atualizar">
              <ng-icon name="lucideRefreshCw" aria-hidden="true" />
            </button>
          </div>
        </div>

        @if (carregando()) {
          <div class="px-4 py-16 text-center text-sm text-muted-foreground">Carregando...</div>
        } @else if (items().length === 0) {
          <z-empty
            class="py-16"
            zIcon="lucideBell"
            zTitle="Nenhuma notificação encontrada"
            zDescription="Ajuste os filtros ou aguarde novos eventos."
          />
        } @else {
          <ul class="divide-y">
            @for (item of items(); track item.id) {
              <li
                class="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                [class]="item.readAt ? '' : 'bg-primary/5'"
              >
                <span
                  class="mt-1.5 size-2 shrink-0 rounded-full"
                  [class]="dotClass(item)"
                  aria-hidden="true"
                ></span>

                <div class="flex min-w-0 flex-1 flex-col gap-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-medium text-foreground">{{ item.title }}</span>
                    <span class="rounded-full border px-2 py-0.5 text-[10px] font-medium" [class]="severityClass(item)">
                      {{ severityLabel(item) }}
                    </span>
                    <span class="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {{ eventLabel(item) }}
                    </span>
                    @if (!item.readAt) {
                      <span class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Nova
                      </span>
                    }
                  </div>

                  <p class="text-sm text-muted-foreground">{{ item.body }}</p>

                  <span class="text-xs text-muted-foreground" [title]="item.createdAt">
                    {{ formatTime(item.createdAt) }}
                  </span>
                </div>

                <div class="flex shrink-0 items-center gap-1">
                  @if (!item.readAt) {
                    <button
                      z-button
                      zType="ghost"
                      zSize="icon"
                      type="button"
                      aria-label="Marcar como lida"
                      (click)="marcarLida(item)"
                    >
                      <ng-icon name="lucideCheckCircle" aria-hidden="true" class="size-4" />
                    </button>
                  }
                  <button
                    z-button
                    zType="ghost"
                    zSize="icon"
                    type="button"
                    aria-label="Remover notificação"
                    (click)="remover(item)"
                  >
                    <ng-icon name="lucideTrash2" aria-hidden="true" class="size-4" />
                  </button>
                </div>
              </li>
            }
          </ul>

          @if (total() > PAGE_SIZE) {
            <div class="border-t p-4">
              <z-pagination
                [totalItems]="total()"
                [pageSize]="PAGE_SIZE"
                [currentPage]="pagina()"
                (pageChange)="onPageChange($event)"
              />
            </div>
          }
        }
      </z-card>

      <div class="flex justify-end">
        <a z-button zType="outline" routerLink="/configuracoes/notificacoes">
          <ng-icon name="lucideSettings" aria-hidden="true" />
          Configurar notificações
        </a>
      </div>
    </main>
  `,
})
export class Notifications implements OnInit {
  private readonly api = inject(NotificationService);
  private readonly center = inject(NotificationCenterService);

  protected readonly PAGE_SIZE = PAGE_SIZE;
  protected readonly eventos = EVENT_OPTIONS;
  protected readonly severidades = SEVERITY_OPTIONS;

  protected readonly items = signal<NotificationItem[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly carregando = signal(false);
  protected readonly evento = signal<NotificationEventType | ''>('');
  protected readonly severidade = signal<NotificationSeverity | ''>('');
  protected readonly somenteNaoLidas = signal(false);
  protected readonly naoLidas = computed(() => this.center.unreadCount());

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    const filters: NotificationFiltersQuery = {
      page: this.pagina(),
      limit: PAGE_SIZE,
      unreadOnly: this.somenteNaoLidas() ? true : undefined,
      eventType: this.evento() || undefined,
      severity: this.severidade() || undefined,
    };

    this.api.list(filters).subscribe({
      next: (response) => {
        this.items.set(response.data);
        this.total.set(response.meta.total);
        this.pagina.set(response.meta.page);
        this.carregando.set(false);
        this.center.refreshUnread();
      },
      error: () => {
        this.carregando.set(false);
        toast.error('Não foi possível carregar as notificações.');
      },
    });
  }

  protected onEventoChange(value: string | string[]): void {
    this.evento.set((Array.isArray(value) ? value[0] : value) as NotificationEventType | '');
    this.pagina.set(1);
    this.carregar();
  }

  protected onSeveridadeChange(value: string | string[]): void {
    this.severidade.set((Array.isArray(value) ? value[0] : value) as NotificationSeverity | '');
    this.pagina.set(1);
    this.carregar();
  }

  protected onNaoLidasChange(value: boolean): void {
    this.somenteNaoLidas.set(value);
    this.pagina.set(1);
    this.carregar();
  }

  protected onPageChange(page: number): void {
    this.pagina.set(page);
    this.carregar();
  }

  protected marcarLida(item: NotificationItem): void {
    if (item.readAt) return;
    this.center.markRead(item.id).subscribe({
      next: (updated) => {
        this.items.update((items) =>
          items.map((current) => (current.id === updated.id ? updated : current)),
        );
      },
      error: () => toast.error('Não foi possível marcar a notificação como lida.'),
    });
  }

  protected marcarTodas(): void {
    this.center.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.items.update((items) =>
          items.map((item) => (item.readAt ? item : { ...item, readAt: now })),
        );
        toast.success('Notificações marcadas como lidas.');
      },
      error: () => toast.error('Não foi possível marcar as notificações como lidas.'),
    });
  }

  protected remover(item: NotificationItem): void {
    this.center.remove(item.id).subscribe({
      next: () => {
        this.items.update((items) => items.filter((current) => current.id !== item.id));
        this.total.update((total) => Math.max(0, total - 1));
        if (this.items().length === 0 && this.pagina() > 1) {
          this.pagina.update((page) => page - 1);
          this.carregar();
        }
      },
      error: () => toast.error('Não foi possível remover a notificação.'),
    });
  }

  protected eventLabel(item: NotificationItem): string {
    return notificationEventLabel(item.eventType);
  }

  protected severityLabel(item: NotificationItem): string {
    return notificationSeverityLabel(item.severity);
  }

  protected formatTime(value: string): string {
    return formatNotificationTime(value);
  }

  protected dotClass(item: NotificationItem): string {
    return NOTIFICATION_SEVERITY_DOT_CLASS[item.severity];
  }

  protected severityClass(item: NotificationItem): string {
    return NOTIFICATION_SEVERITY_BADGE_CLASS[item.severity];
  }
}
