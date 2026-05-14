import { Injectable } from '@angular/core';
import {
  Hunt,
  PlayerProgress,
  Team,
  AnswerSubmission,
} from '../../types';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly LANG_KEY = 'lang_pref';

  constructor(private supabase: SupabaseService) {}

  // ── Hunts (Supabase) ──────────────────────────────────────────────

  async getHunts(userId?: string): Promise<Hunt[]> {
    try { return await this.supabase.getHunts(userId); }
    catch { return []; }
  }

  async saveHunt(hunt: Hunt): Promise<void> {
    try { return await this.supabase.upsertHunt(hunt); }
    catch (e) { throw e; }
  }

  async deleteHunt(id: string): Promise<void> {
    return this.supabase.deleteHunt(id);
  }

  async getHuntByCode(code: string): Promise<Hunt | null> {
    try {
      const byHunt = await this.supabase.getHuntByCode(code);
      if (byHunt) return byHunt;
      const byTeam = await this.supabase.getTeamByCode(code);
      return byTeam ? byTeam.hunt : null;
    } catch { return null; }
  }

  async getHuntById(id: string): Promise<Hunt | null> {
    try { return await this.supabase.getHuntById(id); }
    catch { return null; }
  }

  // ── Player progress (localStorage — ephemeral session data) ──────

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

  // ── Language (localStorage) ───────────────────────────────────────

  getLang(): 'fr' | 'en' {
    return (localStorage.getItem(this.LANG_KEY) as 'fr' | 'en') ?? 'fr';
  }

  setLang(lang: 'fr' | 'en'): void {
    localStorage.setItem(this.LANG_KEY, lang);
  }

  // ── Rules seen (localStorage) ─────────────────────────────────────

  getRulesSeen(code: string): boolean {
    return localStorage.getItem(`rules_seen_${code}`) === 'true';
  }

  setRulesSeen(code: string): void {
    localStorage.setItem(`rules_seen_${code}`, 'true');
  }

  getIntroSeen(code: string): boolean {
    return localStorage.getItem(`intro_seen_${code}`) === 'true';
  }

  setIntroSeen(code: string): void {
    localStorage.setItem(`intro_seen_${code}`, 'true');
  }

  // ── Teams (Supabase) ──────────────────────────────────────────────

  async getTeamsForHunt(huntId: string): Promise<Team[]> {
    try { return await this.supabase.getTeamsForHunt(huntId); }
    catch { return []; }
  }

  async saveTeamsForHunt(huntId: string, teams: Team[]): Promise<void> {
    return this.supabase.upsertTeams(huntId, teams);
  }

  async deleteTeam(_huntId: string, teamId: string): Promise<void> {
    return this.supabase.deleteTeam(teamId);
  }

  async getTeamByCode(code: string): Promise<{ team: Team; hunt: Hunt } | null> {
    try { return await this.supabase.getTeamByCode(code); }
    catch { return null; }
  }

  // ── Submissions (Supabase) ────────────────────────────────────────

  async getSubmissions(huntId: string): Promise<AnswerSubmission[]> {
    try { return await this.supabase.getSubmissions(huntId); }
    catch { return []; }
  }

  async saveSubmission(sub: AnswerSubmission): Promise<void> {
    return this.supabase.upsertSubmission(sub);
  }

  async getHuntsBatchStats(huntIds: string[]): Promise<Map<string, { teamsPlayed: number; totalAnswers: number }>> {
    try { return await this.supabase.getHuntsBatchStats(huntIds); }
    catch { return new Map(); }
  }
}
