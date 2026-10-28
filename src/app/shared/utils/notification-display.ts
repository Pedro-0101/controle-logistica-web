import type { NotificationEventType, NotificationSeverity } from '@/shared/models';

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  'movement.registered': 'Movimentos',
  'external_api.usage': 'API externa',
  'camera.error': 'Câmeras',
  'system.error': 'Sistema',
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  info: 'Informativo',
  warning: 'Atenção',
  error: 'Erro',
  critical: 'Crítico',
};

export const NOTIFICATION_SEVERITY_DOT_CLASS: Record<NotificationSeverity, string> = {
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-destructive',
  critical: 'bg-destructive',
};

export const NOTIFICATION_SEVERITY_BADGE_CLASS: Record<NotificationSeverity, string> = {
  info: 'border-info/30 bg-info/10 text-info',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  critical: 'border-destructive/40 bg-destructive/15 text-destructive',
};

export function notificationEventLabel(type: string): string {
  return NOTIFICATION_EVENT_LABELS[type as NotificationEventType] ?? type;
}

export function notificationSeverityLabel(severity: string): string {
  return NOTIFICATION_SEVERITY_LABELS[severity as NotificationSeverity] ?? severity;
}

export function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
