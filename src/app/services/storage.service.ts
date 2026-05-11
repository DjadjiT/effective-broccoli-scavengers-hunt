import { Injectable } from '@angular/core';
import { Hunt, PlayerProgress } from '../../types';
import { DEMO_HUNT } from '../lib/mock-data';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly HUNTS_KEY = 'hunts';
  private readonly LANG_KEY = 'lang_pref';

  getHunts(): Hunt[] {
    const raw = localStorage.getItem(this.HUNTS_KEY);
    const stored: Hunt[] = raw ? JSON.parse(raw) : [];
    const hasDemoHunt = stored.some(h => h.accessCode === 'PARIS1');
    return hasDemoHunt ? stored : [DEMO_HUNT, ...stored];
  }

  saveHunt(hunt: Hunt): void {
    const hunts = this.getHunts().filter(h => h.id !== 'demo-paris-1');
    const existing = hunts.findIndex(h => h.id === hunt.id);
    if (existing >= 0) {
      hunts[existing] = hunt;
    } else {
      hunts.unshift(hunt);
    }
    localStorage.setItem(this.HUNTS_KEY, JSON.stringify(hunts));
  }

  deleteHunt(id: string): void {
    const hunts = this.getHunts().filter(h => h.id !== id && h.id !== 'demo-paris-1');
    localStorage.setItem(this.HUNTS_KEY, JSON.stringify(hunts));
  }

  getHuntByCode(code: string): Hunt | null {
    const all = this.getHunts();
    return all.find(h => h.accessCode === code.toUpperCase()) ?? null;
  }

  getPlayerProgress(code: string): PlayerProgress | null {
    const raw = localStorage.getItem(`player_${code}`);
    return raw ? JSON.parse(raw) : null;
  }

  savePlayerProgress(progress: PlayerProgress): void {
    localStorage.setItem(`player_${progress.huntCode}`, JSON.stringify(progress));
  }

  clearPlayerProgress(code: string): void {
    localStorage.removeItem(`player_${code}`);
  }

  getLang(): 'fr' | 'en' {
    return (localStorage.getItem(this.LANG_KEY) as 'fr' | 'en') ?? 'fr';
  }

  setLang(lang: 'fr' | 'en'): void {
    localStorage.setItem(this.LANG_KEY, lang);
  }

  getRulesSeen(code: string): boolean {
    return localStorage.getItem(`rules_seen_${code}`) === 'true';
  }

  setRulesSeen(code: string): void {
    localStorage.setItem(`rules_seen_${code}`, 'true');
  }
}
