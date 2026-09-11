import { Injectable } from '@angular/core';

const STORAGE_PREFIX = 'controle-logistica';

/**
 * Serviço genérico para persistência em localStorage.
 *
 * Centraliza leitura/escita com tratamento de erros e prefixo
 * para evitar conflitos com outras aplicações.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  /** Recupera um valor do localStorage. Retorna `null` se não existir ou em caso de erro. */
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.keyFor(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Salva um valor no localStorage. Silencia erros (ex.: quota excedida). */
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.keyFor(key), JSON.stringify(value));
    } catch {
      // localStorage indisponível ou quota excedida — ignora silenciosamente.
    }
  }

  /** Remove uma chave do localStorage. */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.keyFor(key));
    } catch {
      // ignora
    }
  }

  private keyFor(key: string): string {
    return `${STORAGE_PREFIX}:${key}`;
  }
}
