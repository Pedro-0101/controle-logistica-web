import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CompanyNotificationSettings,
  NotificationCatalog,
  NotificationFiltersQuery,
  NotificationItem,
  NotificationPreferences,
  PaginatedNotifications,
  UpdateCompanyNotificationSettingsRequest,
  UpdateNotificationPreferencesRequest,
} from '@/shared/models';
import { toNotificationHttpQuery } from '@/shared/models';
import { ApiClientService } from './api-client.service';

@Service()
export class NotificationService {
  private readonly api = inject(ApiClientService);

  list(filters?: NotificationFiltersQuery): Observable<PaginatedNotifications> {
    return this.api.get<PaginatedNotifications>('/notifications', {
      params: toNotificationHttpQuery(filters),
    });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.api.get<{ count: number }>('/notifications/unread-count');
  }

  markRead(id: string): Observable<NotificationItem> {
    return this.api.post<NotificationItem>(`/notifications/${id}/read`);
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.post<{ updated: number }>('/notifications/read-all');
  }

  remove(id: string): Observable<void> {
    return this.api.delete(`/notifications/${id}`);
  }

  catalog(): Observable<NotificationCatalog> {
    return this.api.get<NotificationCatalog>('/notifications/catalog');
  }

  preferences(): Observable<NotificationPreferences> {
    return this.api.get<NotificationPreferences>('/notifications/preferences');
  }

  updatePreferences(
    payload: UpdateNotificationPreferencesRequest,
  ): Observable<NotificationPreferences> {
    return this.api.put<NotificationPreferences>('/notifications/preferences', payload);
  }

  companySettings(companyId: string): Observable<CompanyNotificationSettings> {
    return this.api.get<CompanyNotificationSettings>(
      `/notifications/company-settings/${companyId}`,
    );
  }

  updateCompanySettings(
    companyId: string,
    payload: UpdateCompanyNotificationSettingsRequest,
  ): Observable<CompanyNotificationSettings> {
    return this.api.put<CompanyNotificationSettings>(
      `/notifications/company-settings/${companyId}`,
      payload,
    );
  }
}
