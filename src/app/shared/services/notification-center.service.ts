import { Service, effect, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import type { NotificationItem } from '@/shared/models';
import { SessionService } from '@/shared/core/auth';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';

const POLL_INTERVAL_MS = 30_000;

/**
 * Estado compartilhado do sino de notificações: contador de não lidas,
 * prévia das mais recentes e atualização periódica por polling.
 */
@Service()
export class NotificationCenterService {
  private readonly api = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly logger = inject(LoggerService).create('NotificationCenterService');

  private readonly _unreadCount = signal(0);
  private readonly _recent = signal<NotificationItem[]>([]);
  private readonly _loadingRecent = signal(false);

  readonly unreadCount = this._unreadCount.asReadonly();
  readonly recent = this._recent.asReadonly();
  readonly loadingRecent = this._loadingRecent.asReadonly();

  private polling = false;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor() {
    this.timer = setInterval(() => this.refreshUnread(), POLL_INTERVAL_MS);
    effect(() => {
      if (this.session.isAuthenticated()) this.refreshUnread();
    });
  }

  refreshUnread(): void {
    if (!this.session.isAuthenticated() || this.polling) return;
    this.polling = true;
    this.api
      .unreadCount()
      .pipe(finalize(() => (this.polling = false)))
      .subscribe({
        next: ({ count }) => this._unreadCount.set(count),
        error: (error: unknown) => this.logger.debug('Falha ao atualizar contador', error),
      });
  }

  refreshRecent(limit = 6): void {
    if (!this.session.isAuthenticated()) return;
    this._loadingRecent.set(true);
    this.api
      .list({ page: 1, limit })
      .pipe(finalize(() => this._loadingRecent.set(false)))
      .subscribe({
        next: (response) => this._recent.set(response.data),
        error: (error: unknown) => this.logger.debug('Falha ao carregar notificações', error),
      });
  }

  markRead(id: string): Observable<NotificationItem> {
    return this.api.markRead(id).pipe(
      tap((item) => {
        this._recent.update((items) => items.map((current) => (current.id === id ? item : current)));
        if (!item.readAt) return;
        this._unreadCount.update((count) => Math.max(0, count - 1));
      }),
    );
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.markAllRead().pipe(
      tap(() => {
        const now = new Date().toISOString();
        this._recent.update((items) =>
          items.map((item) => (item.readAt ? item : { ...item, readAt: now })),
        );
        this._unreadCount.set(0);
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.api.remove(id).pipe(
      tap(() => {
        const removed = this._recent().find((item) => item.id === id);
        this._recent.update((items) => items.filter((item) => item.id !== id));
        if (removed && !removed.readAt) {
          this._unreadCount.update((count) => Math.max(0, count - 1));
        }
      }),
    );
  }

  dispose(): void {
    clearInterval(this.timer);
  }
}
