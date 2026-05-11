import { Injectable, signal, computed } from '@angular/core';
import { translations, TranslationKey } from '../lib/i18n';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private lang = signal<'fr' | 'en'>('fr');

  constructor(private storage: StorageService) {
    this.lang.set(storage.getLang());
  }

  currentLang = computed(() => this.lang());

  toggle(): void {
    const next = this.lang() === 'fr' ? 'en' : 'fr';
    this.lang.set(next);
    this.storage.setLang(next);
  }

  t(key: TranslationKey): string {
    return translations[this.lang()][key];
  }

  stepOf(current: number, total: number): string {
    return this.lang() === 'fr'
      ? `Étape ${current} sur ${total}`
      : `Step ${current} of ${total}`;
  }

  formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}
