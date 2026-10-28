export const NOTIFICATION_EVENT_TYPES = [
  'movement.registered',
  'external_api.usage',
  'camera.error',
  'system.error',
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const;

export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export type NotificationResourceType = 'movement' | 'camera' | 'external_interaction' | 'system';

export type NotificationFilters = Record<string, unknown>;

export interface NotificationItem {
  id: string;
  companyId: string | null;
  userId: string;
  eventType: NotificationEventType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  resourceType: NotificationResourceType | null;
  resourceId: string | null;
  pointId: string | null;
  cameraId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: NotificationsMeta;
}

export interface NotificationFiltersQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  eventType?: NotificationEventType;
  severity?: NotificationSeverity;
  dateFrom?: string;
  dateTo?: string;
}

export interface NotificationFilterOption {
  value: string;
  label: string;
}

export type NotificationFilterKind = 'points' | 'cameras' | 'options' | 'boolean';

export interface NotificationFilterDefinition {
  key: string;
  label: string;
  kind: NotificationFilterKind;
  options?: NotificationFilterOption[];
  multiple?: boolean;
}

export interface NotificationEventDefinition {
  type: NotificationEventType;
  label: string;
  description: string;
  defaultEnabled: boolean;
  defaultFilters: NotificationFilters;
  dedupeWindowSeconds: number;
  filters: NotificationFilterDefinition[];
}

export interface NotificationCatalog {
  events: NotificationEventDefinition[];
}

export interface NotificationPointOption {
  id: string;
  name: string;
  code: string;
}

export interface NotificationCameraOption {
  id: string;
  name: string;
  pointId: string;
}

export interface NotificationAvailableFilters {
  points: NotificationPointOption[];
  cameras: NotificationCameraOption[];
}

export interface NotificationPreferenceItem {
  eventType: NotificationEventType;
  enabled: boolean;
  filters: NotificationFilters;
  source: 'user' | 'company' | 'catalog';
  override: {
    enabled: boolean | null;
    filters: NotificationFilters | null;
  } | null;
  company: {
    enabled: boolean;
    defaultFilters: NotificationFilters | null;
    allowUserOverride: boolean;
  } | null;
}

export interface NotificationPreferences {
  events: NotificationPreferenceItem[];
  availableFilters: NotificationAvailableFilters;
}

export interface CompanyNotificationSettingItem {
  eventType: NotificationEventType;
  enabled: boolean;
  defaultFilters: NotificationFilters | null;
  allowUserOverride: boolean;
  isDefault: boolean;
}

export interface CompanyNotificationSettings {
  companyId: string;
  events: CompanyNotificationSettingItem[];
  availableFilters: NotificationAvailableFilters;
}

export interface UpdateNotificationPreferenceItem {
  eventType: NotificationEventType;
  enabled?: boolean | null;
  filters?: NotificationFilters | null;
}

export interface UpdateNotificationPreferencesRequest {
  items: UpdateNotificationPreferenceItem[];
}

export interface UpdateCompanyNotificationSettingItem {
  eventType: NotificationEventType;
  enabled?: boolean;
  defaultFilters?: NotificationFilters | null;
  allowUserOverride?: boolean;
}

export interface UpdateCompanyNotificationSettingsRequest {
  items: UpdateCompanyNotificationSettingItem[];
}

export function toNotificationHttpQuery(
  filters?: NotificationFiltersQuery,
): Record<string, string | number | boolean | null | undefined> {
  if (!filters) return {};
  const query: Record<string, string | number | boolean | null | undefined> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    query[key] = value;
  }
  return query;
}
