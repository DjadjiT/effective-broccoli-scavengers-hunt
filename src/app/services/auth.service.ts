import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../types';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly currentUserName = computed(() => this._user()?.name ?? '');

  // Resolves once the initial session check (INITIAL_SESSION event + profile load) is done.
  // The auth guard awaits this before deciding to allow or redirect.
  readonly ready: Promise<void>;

  constructor(private supabase: SupabaseService) {
    // getSession() reads from localStorage synchronously then resolves —
    // used only to build `ready` so the guard can wait for the initial profile load.
    this.ready = this.supabase.client.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        await this.loadProfile(data.session.user.id);
      }
    });

    // Synchronous handler — must NOT be async to avoid blocking signInWithPassword.
    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this._user.set(null);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    try {
      const profile = await this.supabase.getProfileById(userId);
      if (profile) this._user.set(profile);
    } catch {
      this._user.set(null);
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { ok: false, error: 'Email et mot de passe requis.' };
    }

    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) return { ok: false, error: error.message };

    const profile = await this.supabase.getProfileById(data.user.id);
    if (!profile) return { ok: false, error: 'Profil introuvable.' };

    this._user.set(profile);
    return { ok: true, user: profile };
  }

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) return { ok: false, error: 'Le nom est requis.' };
    if (!normalizedEmail) return { ok: false, error: 'Email requis.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false, error: "Format d'email invalide." };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'Mot de passe (6 caractères minimum).' };
    }

    const { data, error } = await this.supabase.client.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: trimmedName } },
    });

    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: 'Erreur lors de la création du compte.' };

    const profile: User = {
      id: data.user.id,
      email: normalizedEmail,
      name: trimmedName,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    // Trigger handles profile creation; upsert is a best-effort update for the name
    try { await this.supabase.upsertProfile(profile); } catch { /* trigger fallback */ }
    this._user.set(profile);
    return { ok: true, user: profile };
  }

  async logout(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._user.set(null);
  }
}
