import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { toast } from 'ngx-sonner';

import type { NotificationItem } from '@/shared/models';
import { NotificationCenterService } from '@/shared/services/notification-center.service';
import { ZardButtonComponent } from '@/shared/components/button';
import {
  NOTIFICATION_SEVERITY_DOT_CLASS,
  formatNotificationTime,
  notificationEventLabel,
} from '@/shared/utils/notification-display';

@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, NgIcon, ZardButtonComponent],
  host: {
    '(document:click)': 'aberto.set(false)',
  },
  template: `
    <div class="relative">
      <button
        z-button
        zType="ghost"
        zSize="icon"
        type="button"
        class="relative"
        aria-label="Notificações"
        [attr.aria-expanded]="aberto()"
        aria-haspopup="dialog"
        (click)="alternar($event)"
      >
        <ng-icon name="lucideBell" aria-hidden="true" class="size-4" />
        @if (naoLidas() > 0) {
          <span
            class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
          >
            {{ naoLidas() > 99 ? '99+' : naoLidas() }}
          </span>
        }
      </button>

      @if (aberto()) {
        <div
          class="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          role="dialog"
          aria-label="Notificações"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span class="text-sm font-medium">Notificações</span>
            @if (naoLidas() > 0) {
              <button
                z-button
                zType="ghost"
                zSize="sm"
                type="button"
                (click)="marcarTodas()"
              >
                Marcar todas como lidas
              </button>
            }
          </div>

          @if (carregando()) {
            <div class="px-3 py-8 text-center text-sm text-muted-foreground">Carregando...</div>
          } @else if (recentes().length === 0) {
            <div class="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <ng-icon name="lucideBell" aria-hidden="true" class="size-8 text-muted-foreground" />
              <span class="text-sm text-muted-foreground">Nenhuma notificação por aqui.</span>
            </div>
          } @else {
            <ul class="max-h-[24rem] overflow-y-auto py-1">
              @for (item of recentes(); track item.id) {
                <li
                  class="flex items-start gap-1 px-1 transition-colors hover:bg-accent/60"
                  [class]="item.readAt ? '' : 'bg-primary/5'"
                >
                  <button
                    type="button"
                    class="flex flex-1 items-start gap-3 rounded-sm px-2 py-2 text-left"
                    (click)="marcarLida(item)"
                  >
                    <span
                      class="mt-1.5 size-2 shrink-0 rounded-full"
                      [class]="dotClass(item)"
                      aria-hidden="true"
                    ></span>
                    <span class="flex min-w-0 flex-col gap-0.5">
                      <span class="flex items-center gap-2">
                        <span class="truncate text-sm font-medium text-foreground">
                          {{ item.title }}
                        </span>
                        <span class="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {{ eventLabel(item) }}
                        </span>
                      </span>
                      <span class="line-clamp-2 text-xs text-muted-foreground">{{ item.body }}</span>
                      <span class="text-[11px] text-muted-foreground">
                        {{ formatTime(item.createdAt) }}
                      </span>
                    </span>
                  </button>

                  <button
                    z-button
                    zType="ghost"
                    zSize="icon"
                    type="button"
                    class="mt-1 size-7 shrink-0"
                    aria-label="Remover notificação"
                    (click)="remover(item, $event)"
                  >
                    <ng-icon name="lucideX" aria-hidden="true" class="size-3.5" />
                  </button>
                </li>
              }
            </ul>
          }

          <div class="flex items-center justify-between gap-2 border-t px-3 py-2">
            <a
              z-button
              zType="ghost"
              zSize="sm"
              routerLink="/notificacoes"
              (click)="aberto.set(false)"
            >
              Ver todas
            </a>
            <a
              z-button
              zType="ghost"
              zSize="sm"
              routerLink="/configuracoes/notificacoes"
              (click)="aberto.set(false)"
            >
              <ng-icon name="lucideSettings" aria-hidden="true" class="size-3.5" />
              Preferências
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBell {
  private readonly center = inject(NotificationCenterService);

  protected readonly aberto = signal(false);
  protected readonly naoLidas = computed(() => this.center.unreadCount());
  protected readonly recentes = computed(() => this.center.recent());
  protected readonly carregando = computed(() => this.center.loadingRecent());

  protected alternar(event: MouseEvent): void {
    event.stopPropagation();
    const abrindo = !this.aberto();
    this.aberto.set(abrindo);
    if (abrindo) {
      this.center.refreshUnread();
      this.center.refreshRecent();
    }
  }

  protected marcarLida(item: NotificationItem): void {
    if (item.readAt) return;
    this.center.markRead(item.id).subscribe({
      error: () => toast.error('Não foi possível marcar a notificação como lida.'),
    });
  }

  protected marcarTodas(): void {
    this.center.markAllRead().subscribe({
      next: () => toast.success('Notificações marcadas como lidas.'),
      error: () => toast.error('Não foi possível marcar as notificações como lidas.'),
    });
  }

  protected remover(item: NotificationItem, event: MouseEvent): void {
    event.stopPropagation();
    this.center.remove(item.id).subscribe({
      error: () => toast.error('Não foi possível remover a notificação.'),
    });
  }

  protected eventLabel(item: NotificationItem): string {
    return notificationEventLabel(item.eventType);
  }

  protected formatTime(value: string): string {
    return formatNotificationTime(value);
  }

  protected dotClass(item: NotificationItem): string {
    return NOTIFICATION_SEVERITY_DOT_CLASS[item.severity];
  }
}
