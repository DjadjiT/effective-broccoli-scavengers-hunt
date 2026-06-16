import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Hunt, HuntStatus, Team, AnswerSubmission, User } from '../../types';

// ── DB row types (snake_case ↔ camelCase) ─────────────────────────────────────

interface DbHunt {
  id: string;
  name: string;
  description: string | null;
  published: boolean;
  created_at: string;
  created_by: string;
  steps: Hunt['steps'];
  media: Hunt['media'];
  status: HuntStatus;
  duration_seconds: number;
  started_at: string | null;
  finished_at: string | null;
}

interface DbTeam {
  id: string;
  hunt_id: string;
  name: string;
  access_code: string;
  created_at: string;
}

interface DbSubmission {
  id: string;
  hunt_id: string;
  step_id: string;
  enigma_id: string;
  team_id: string;
  team_name: string;
  step_title: string;
  enigma_title: string;
  type: string;
  text_value: string;
  selected_option_ids: string[];
  media_name: string;
  submitted_at: string;
  status: string;
  points_awarded: number;
  points_possible: number;
  reviewed_at: string | null;
  review_note: string | null;
}

interface DbProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function huntFromDb(row: DbHunt): Hunt {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    published: row.published,
    createdAt: row.created_at,
    createdBy: row.created_by,
    steps: row.steps ?? [],
    media: row.media ?? [],
    status: row.status ?? 'draft',
    durationSeconds: row.duration_seconds ?? 0,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
  };
}

function huntToDb(h: Hunt): DbHunt {
  return {
    id: h.id,
    name: h.name,
    description: h.description ?? null,
    published: h.published,
    created_at: h.createdAt,
    created_by: h.createdBy,
    steps: h.steps,
    media: h.media ?? [],
    status: h.status ?? 'draft',
    duration_seconds: h.durationSeconds ?? 0,
    started_at: h.startedAt ?? null,
    finished_at: h.finishedAt ?? null,
  };
}

function teamFromDb(row: DbTeam): Team {
  return {
    id: row.id,
    huntId: row.hunt_id,
    name: row.name,
    accessCode: row.access_code,
    createdAt: row.created_at,
  };
}

function teamToDb(t: Team): DbTeam {
  return {
    id: t.id,
    hunt_id: t.huntId,
    name: t.name,
    access_code: t.accessCode,
    created_at: t.createdAt,
  };
}

function submissionFromDb(row: DbSubmission): AnswerSubmission {
  return {
    id: row.id,
    huntId: row.hunt_id,
    stepId: row.step_id,
    enigmaId: row.enigma_id,
    teamId: row.team_id,
    teamName: row.team_name,
    stepTitle: row.step_title,
    enigmaTitle: row.enigma_title,
    type: row.type as AnswerSubmission['type'],
    textValue: row.text_value,
    selectedOptionIds: row.selected_option_ids ?? [],
    mediaName: row.media_name,
    submittedAt: row.submitted_at,
    status: row.status as AnswerSubmission['status'],
    pointsAwarded: row.points_awarded,
    pointsPossible: row.points_possible,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
  };
}

function submissionToDb(s: AnswerSubmission): DbSubmission {
  return {
    id: s.id,
    hunt_id: s.huntId,
    step_id: s.stepId,
    enigma_id: s.enigmaId,
    team_id: s.teamId,
    team_name: s.teamName,
    step_title: s.stepTitle,
    enigma_title: s.enigmaTitle,
    type: s.type,
    text_value: s.textValue,
    selected_option_ids: s.selectedOptionIds,
    media_name: s.mediaName,
    submitted_at: s.submittedAt,
    status: s.status,
    points_awarded: s.pointsAwarded,
    points_possible: s.pointsPossible,
    reviewed_at: s.reviewedAt ?? null,
    review_note: s.reviewNote ?? null,
  };
}

function userFromDb(row: DbProfile): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
  );

  // ── Hunts ─────────────────────────────────────────────────────────────────

  async getHunts(userId?: string): Promise<Hunt[]> {
    let query = this.client
      .from('hunts')
      .select('*')
      .order('created_at', { ascending: false });
    if (userId) query = query.eq('created_by', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as DbHunt[]).map(huntFromDb);
  }

  async getHuntById(id: string): Promise<Hunt | null> {
    const { data, error } = await this.client
      .from('hunts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? huntFromDb(data as DbHunt) : null;
  }

  async upsertHunt(hunt: Hunt): Promise<void> {
    const { error } = await this.client
      .from('hunts')
      .upsert(huntToDb(hunt));
    if (error) throw error;
  }

  async deleteHunt(id: string): Promise<void> {
    const { error } = await this.client
      .from('hunts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  async getTeamsForHunt(huntId: string): Promise<Team[]> {
    const { data, error } = await this.client
      .from('teams')
      .select('*')
      .eq('hunt_id', huntId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as DbTeam[]).map(teamFromDb);
  }

  async getTeamByCode(code: string): Promise<{ team: Team; hunt: Hunt } | null> {
    const { data, error } = await this.client
      .from('teams')
      .select('*, hunts(*)')
      .eq('access_code', code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as DbTeam & { hunts: DbHunt };
    return {
      team: teamFromDb(row),
      hunt: huntFromDb(row.hunts),
    };
  }

  async upsertTeams(huntId: string, teams: Team[]): Promise<void> {
    // Delete removed teams then upsert current list
    const { error: delErr } = await this.client
      .from('teams')
      .delete()
      .eq('hunt_id', huntId)
      .not('id', 'in', `(${teams.map(t => `'${t.id}'`).join(',')})`);
    if (delErr) throw delErr;
    if (teams.length === 0) return;
    const { error } = await this.client
      .from('teams')
      .upsert(teams.map(teamToDb));
    if (error) throw error;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.client.from('answer_submissions').delete().eq('team_id', teamId);
    const { error } = await this.client.from('teams').delete().eq('id', teamId);
    if (error) throw error;
  }

  // ── Hunt lifecycle ────────────────────────────────────────────────────────

  async startHunt(huntId: string): Promise<Hunt> {
    const { data, error } = await this.client
      .from('hunts')
      .update({ status: 'started', started_at: new Date().toISOString() })
      .eq('id', huntId)
      .select()
      .single();
    if (error) throw error;
    return huntFromDb(data as DbHunt);
  }

  async resetHunt(huntId: string): Promise<Hunt> {
    const { data, error } = await this.client
      .from('hunts')
      .update({ status: 'started', started_at: new Date().toISOString(), finished_at: null })
      .eq('id', huntId)
      .select()
      .single();
    if (error) throw error;
    return huntFromDb(data as DbHunt);
  }

  async finishHunt(huntId: string): Promise<Hunt> {
    const { data, error } = await this.client
      .from('hunts')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', huntId)
      .select()
      .single();
    if (error) throw error;
    return huntFromDb(data as DbHunt);
  }

  subscribeToHunt(huntId: string, onUpdate: (hunt: Hunt) => void): RealtimeChannel {
    return this.client
      .channel(`hunt-status:${huntId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'hunts', filter: `id=eq.${huntId}` },
        (payload) => onUpdate(huntFromDb(payload.new as DbHunt)),
      )
      .subscribe();
  }

  // ── Submissions ───────────────────────────────────────────────────────────

  async getSubmissions(huntId: string): Promise<AnswerSubmission[]> {
    const { data, error } = await this.client
      .from('answer_submissions')
      .select('*')
      .eq('hunt_id', huntId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data as DbSubmission[]).map(submissionFromDb);
  }

  async getHuntsBatchStats(huntIds: string[]): Promise<Map<string, { teamsPlayed: number; totalAnswers: number }>> {
    if (huntIds.length === 0) return new Map();
    const { data, error } = await this.client
      .from('answer_submissions')
      .select('hunt_id,team_id')
      .in('hunt_id', huntIds);
    if (error) throw error;

    const result = new Map<string, { teamsPlayed: number; totalAnswers: number }>();
    const teamSets = new Map<string, Set<string>>();

    for (const row of (data ?? []) as { hunt_id: string; team_id: string }[]) {
      if (!result.has(row.hunt_id)) result.set(row.hunt_id, { teamsPlayed: 0, totalAnswers: 0 });
      if (!teamSets.has(row.hunt_id)) teamSets.set(row.hunt_id, new Set());
      result.get(row.hunt_id)!.totalAnswers++;
      teamSets.get(row.hunt_id)!.add(row.team_id);
    }
    for (const [huntId, teamSet] of teamSets) {
      result.get(huntId)!.teamsPlayed = teamSet.size;
    }
    return result;
  }

  async upsertSubmission(sub: AnswerSubmission): Promise<void> {
    const { error } = await this.client
      .from('answer_submissions')
      .upsert(submissionToDb(sub));
    if (error) throw error;
  }

  // ── Enigma attempts ───────────────────────────────────────────────────────

  async incrementWrongAttempt(huntId: string, enigmaId: string, teamId: string): Promise<number> {
    const { data: existing } = await this.client
      .from('enigma_attempts')
      .select('wrong_count')
      .eq('hunt_id', huntId)
      .eq('enigma_id', enigmaId)
      .eq('team_id', teamId)
      .maybeSingle();

    const newCount = ((existing as { wrong_count: number } | null)?.wrong_count ?? 0) + 1;

    const { error } = await this.client
      .from('enigma_attempts')
      .upsert({ hunt_id: huntId, enigma_id: enigmaId, team_id: teamId, wrong_count: newCount, updated_at: new Date().toISOString() });

    if (error) throw error;
    return newCount;
  }

  async getAttemptCounts(huntId: string, teamId: string): Promise<Map<string, number>> {
    const { data, error } = await this.client
      .from('enigma_attempts')
      .select('enigma_id, wrong_count')
      .eq('hunt_id', huntId)
      .eq('team_id', teamId);

    if (error) throw error;
    const map = new Map<string, number>();
    for (const row of (data ?? []) as { enigma_id: string; wrong_count: number }[]) {
      map.set(row.enigma_id, row.wrong_count);
    }
    return map;
  }

  async getAllAttemptCounts(huntId: string): Promise<Map<string, number>> {
    const { data, error } = await this.client
      .from('enigma_attempts')
      .select('enigma_id, team_id, wrong_count')
      .eq('hunt_id', huntId);

    if (error) throw error;
    const map = new Map<string, number>();
    for (const row of (data ?? []) as { enigma_id: string; team_id: string; wrong_count: number }[]) {
      map.set(`${row.team_id}:${row.enigma_id}`, row.wrong_count);
    }
    return map;
  }

  // ── Profiles ──────────────────────────────────────────────────────────────

  async getProfileById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? userFromDb(data as DbProfile) : null;
  }

  async upsertProfile(user: User): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
        role: user.role,
        created_at: user.createdAt,
      } satisfies DbProfile);
    if (error) throw error;
  }
}
