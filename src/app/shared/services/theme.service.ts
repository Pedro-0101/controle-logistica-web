import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'crw-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _theme = signal<Theme>(this.resolveInitialTheme());

  /** Tema atual como signal Somente leitura. */
  readonly theme = computed(() => this._theme());

  /** `true` quando o tema escuro está ativo. */
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.apply(this._theme());
    }
  }

  /** Define o tema explicitamente. */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
    this.persist(theme);
    this.apply(theme);
  }

  /** Alterna entre claro e escuro. */
  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private resolveInitialTheme(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'light';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private persist(theme: Theme): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  private apply(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const classList = this.document.documentElement.classList;
    if (theme === 'dark') classList.add('dark');
    else classList.remove('dark');
  }
}