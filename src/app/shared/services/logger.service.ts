import { isDevMode } from '@angular/core';
import { Service } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

const LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #8b5cf6; font-weight: bold',
  info: 'color: #3b82f6; font-weight: bold',
  warn: 'color: #f59e0b; font-weight: bold',
  error: 'color: #ef4444; font-weight: bold',
};

type LogFn = (message?: unknown, ...optionalParams: unknown[]) => void;

const CONSOLE_METHODS: Record<LogLevel, LogFn> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

/**
 * Logger estruturado que só emite logs no console do navegador em modo de
 * desenvolvimento. Em produção (build com `--configuration production`) todas
 * as chamadas tornam-se no-ops, sem custo de runtime.
 */
@Service()
export class LoggerService {
  private readonly devMode = isDevMode();

  private context?: string;

  /** `true` quando o logger está ativo (ambiente de desenvolvimento). */
  get enabled(): boolean {
    return this.devMode;
  }

  debug(message: string, data?: unknown): void {
    this.write('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.write('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.write('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.write('error', message, data);
  }

  /** Cria um logger derivado com contexto fixo (ex.: nome do serviço). */
  create(context: string): LoggerService {
    const child = Object.create(this) as LoggerService;
    child.context = context;
    return child;
  }

  private write(level: LogLevel, message: string, data?: unknown): void {
    if (!this.devMode) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(this.context ? { context: this.context } : {}),
      ...(data !== undefined ? { data } : {}),
    };

    const label = entry.context ? `[${entry.context}]` : '';
    CONSOLE_METHODS[level](
      `%c${level.toUpperCase()}%c ${label} ${message}`,
      LEVEL_STYLES[level],
      '',
      entry,
    );
  }
}