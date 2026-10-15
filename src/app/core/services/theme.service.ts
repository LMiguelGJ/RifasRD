import { Injectable, computed, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

/** Same storage key as the production site so a saved preference carries over. */
const STORAGE_KEY = 'rifas-luxury-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly current = signal<Theme>('dark');
  readonly theme = this.current.asReadonly();
  readonly isDark = computed(() => this.current() === 'dark');

  init(): void {
    if (typeof document === 'undefined') return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage blocked: keep the default */
    }
    this.apply(saved === 'light' ? 'light' : 'dark');
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage blocked: preference lasts for this session only */
    }
  }

  private apply(theme: Theme): void {
    this.current.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
