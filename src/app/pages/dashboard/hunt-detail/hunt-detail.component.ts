import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StorageService } from '../../../services/storage.service';
import { Hunt, Hint, Team, AnswerSubmission, AnswerStatus } from '../../../../types';
import { DashNavComponent } from '../../../components/dash-nav/dash-nav.component';
import { MarkdownPipe } from '../../../lib/markdown.pipe';

type TabId = 'overview' | 'teams' | 'moderation';
type FilterId = 'all' | AnswerStatus;

@Component({
  selector: 'app-hunt-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DashNavComponent, MarkdownPipe],
  template: `
    <app-dash-nav></app-dash-nav>

    @if (hunt) {
      <main class="detail-page">
        <div class="page-head">
          <a routerLink="/dashboard" class="back-link">← Tableau de bord</a>
          <h1 class="hunt-name">{{ hunt.name || 'Sans nom' }}</h1>
          @if (hunt.description) {
            <div class="hunt-desc md-render" [innerHTML]="hunt.description | md"></div>
          }
        </div>

        <!-- Tabs -->
        <nav class="tabs">
          <button
            type="button"
            class="tab"
            [class.active]="tab === 'overview'"
            (click)="setTab('overview')"
          >Aperçu</button>
          <button
            type="button"
            class="tab"
            [class.active]="tab === 'teams'"
            (click)="setTab('teams')"
          >Équipes <span class="tab-count">{{ teams.length }}</span></button>
          <button
            type="button"
            class="tab"
            [class.active]="tab === 'moderation'"
            (click)="setTab('moderation')"
          >Modération
            @if (pendingCount > 0) {
              <span class="tab-count tab-count-alert">{{ pendingCount }}</span>
            }
          </button>
        </nav>

        <!-- ── OVERVIEW ── -->
        @if (tab === 'overview') {
          <section class="card overview-card">
            <h2>Statut</h2>
            <div class="status-row">
              @if (hunt.published) {
                <span class="status-badge status-mint">✅ Publié</span>
              } @else {
                <span class="status-badge status-lemon">📝 Brouillon</span>
              }
              <button
                type="button"
                class="btn-toggle"
                (click)="togglePublished()"
              >
                {{ hunt.published ? 'Repasser en brouillon' : 'Publier' }}
              </button>
            </div>

            <!-- Hunt lifecycle status -->
            @if (hunt.status !== 'draft') {
              <div class="status-row status-row-lifecycle">
                <span class="status-badge" [ngClass]="huntStatusBadgeClass">{{ huntStatusBadgeLabel }}</span>
                @if (hunt.durationSeconds > 0) {
                  <span class="duration-badge">⏱ {{ formatDuration(hunt.durationSeconds) }}</span>
                }
                @if (countdownDisplay) {
                  <span class="duration-badge countdown-live" [class.countdown-urgent]="countdownUrgent">⏳ {{ countdownDisplay }}</span>
                }
                @if (hunt.status === 'ready') {
                  <button type="button" class="btn-lifecycle btn-lifecycle-start" (click)="doStartHunt()">
                    🚀 Lancer la chasse
                  </button>
                }
                @if (hunt.status === 'started') {
                  <button type="button" class="btn-lifecycle btn-lifecycle-finish" (click)="doFinishHunt()">
                    🏁 Terminer la chasse
                  </button>
                  <button type="button" class="btn-lifecycle btn-lifecycle-reset" (click)="doResetHunt()">
                    🔄 Redémarrer le timer
                  </button>
                }
                @if (hunt.status === 'finished') {
                  <button type="button" class="btn-lifecycle btn-lifecycle-reset" (click)="doResetHunt()">
                    🔄 Redémarrer la chasse
                  </button>
                }
              </div>
            }

            <h2 class="mt">Statistiques</h2>
            <div class="stat-row">
              <div class="stat stat-coral">
                <span class="stat-num">{{ hunt.steps.length }}</span>
                <span class="stat-label">Étape{{ hunt.steps.length > 1 ? 's' : '' }}</span>
              </div>
              <div class="stat stat-mint">
                <span class="stat-num">{{ totalEnigmas }}</span>
                <span class="stat-label">Énigme{{ totalEnigmas > 1 ? 's' : '' }}</span>
              </div>
              <div class="stat stat-sky">
                <span class="stat-num">{{ teams.length }}</span>
                <span class="stat-label">Équipe{{ teams.length > 1 ? 's' : '' }}</span>
              </div>
            </div>

            <div class="overview-actions">
              <button type="button" class="btn-action btn-edit" (click)="goToEdit()">
                ✏️ Modifier les étapes
              </button>
              @if (teams.length > 0) {
                <button type="button" class="btn-action btn-play" (click)="goToPlay()">
                  ▶ Voir en tant que joueur
                </button>
              }
            </div>
          </section>
        }

        <!-- ── TEAMS ── -->
        @if (tab === 'teams') {
          <section class="card">
            <div class="teams-head">
              <h2>Équipes</h2>
              <button
                type="button"
                class="btn-add"
                (click)="showTeamForm = !showTeamForm"
              >
                {{ showTeamForm ? 'Fermer' : '+ Ajouter une équipe' }}
              </button>
            </div>

            @if (showTeamForm) {
              <form class="team-form" (ngSubmit)="addTeam()" novalidate>
                <div class="field">
                  <label for="team-name">Nom de l'équipe</label>
                  <input
                    id="team-name"
                    type="text"
                    class="field-input"
                    [(ngModel)]="newTeamName"
                    name="teamName"
                    placeholder="Ex : Les Aventuriers"
                  />
                </div>
                <div class="field">
                  <label for="team-code">Code (laisser vide pour générer)</label>
                  <div class="code-row">
                    <input
                      id="team-code"
                      type="text"
                      class="field-input code-field"
                      [(ngModel)]="newTeamCode"
                      name="teamCode"
                      maxlength="6"
                      placeholder="ABC123"
                      (ngModelChange)="normalizeCode($event)"
                    />
                    <button type="button" class="btn-generate" (click)="generateCode()">
                      🎲 Générer
                    </button>
                  </div>
                </div>
                <button type="submit" class="btn-submit-form">Ajouter</button>
              </form>
            }

            @if (teams.length === 0) {
              <div class="empty-inline">
                <p>Aucune équipe pour cette chasse.</p>
                <p class="muted">Créez une équipe pour générer un code dédié.</p>
              </div>
            } @else {
              <div class="team-list">
                @for (t of teams; track t.id) {
                  <div class="team-card">
                    <div class="team-info">
                      <span class="team-name">👥 {{ t.name }}</span>
                      <div class="team-code-row">
                        <code class="team-code">{{ t.accessCode }}</code>
                        <button
                          type="button"
                          class="btn-mini"
                          (click)="copyCode(t.accessCode)"
                        >📋</button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="btn-delete-team"
                      (click)="deleteTeam(t)"
                      title="Supprimer l'équipe"
                    >🗑️</button>
                  </div>
                }
              </div>
            }
          </section>
        }

        <!-- ── MODERATION ── -->
        @if (tab === 'moderation') {
          <section class="card">
            <div class="mod-head">
              <h2>Modération des réponses</h2>
              <button type="button" class="btn-refresh" (click)="refreshSubmissions()">
                ↻ Actualiser
              </button>
            </div>

            <div class="filter-pills">
              <button
                type="button"
                class="pill"
                [class.active]="filter === 'all'"
                (click)="setFilter('all')"
              >Tous ({{ submissions.length }})</button>
              <button
                type="button"
                class="pill pill-lemon"
                [class.active]="filter === 'pending'"
                (click)="setFilter('pending')"
              >⏳ En attente ({{ countByStatus('pending') }})</button>
              <button
                type="button"
                class="pill pill-mint"
                [class.active]="filter === 'approved'"
                (click)="setFilter('approved')"
              >✅ Approuvés ({{ countByStatus('approved') }})</button>
              <button
                type="button"
                class="pill pill-coral"
                [class.active]="filter === 'rejected'"
                (click)="setFilter('rejected')"
              >❌ Refusés ({{ countByStatus('rejected') }})</button>
            </div>

            @if (filteredSubmissions.length === 0) {
              <div class="empty-inline">
                <p>Aucune réponse soumise</p>
                <p class="muted">Les réponses des joueurs apparaîtront ici.</p>
              </div>
            } @else {
              <div class="sub-list">
                @for (s of filteredSubmissions; track s.id) {
                  <article class="sub-card" [class.is-pending]="s.status === 'pending'">
                    <header class="sub-head">
                      <div class="sub-head-left">
                        <span class="sub-icon">{{ typeIcon(s.type) }}</span>
                        <div class="sub-titles">
                          <span class="sub-team">👥 {{ s.teamName }}</span>
                          <span class="sub-step">{{ s.stepTitle || 'Étape' }} · {{ s.enigmaTitle || 'Énigme' }}</span>
                        </div>
                      </div>
                      <span class="status-badge" [ngClass]="statusClass(s.status)">
                        {{ statusLabel(s.status) }}
                      </span>
                    </header>

                    <div class="sub-body">
                      @let question = getEnigmaDescription(s);
                      @if (question) {
                        <p class="sub-question">{{ question }}</p>
                      }
                      @if (s.type === 'text') {
                        <p class="sub-answer">"{{ s.textValue }}"</p>
                      } @else if (s.type === 'media') {
                        @if (isMediaUrl(s.mediaName)) {
                          <a [href]="s.mediaName" target="_blank" rel="noopener" class="sub-media-link">
                            <img class="sub-media-img" [src]="s.mediaName" alt="Photo soumise" loading="lazy" />
                          </a>
                        } @else {
                          <p class="sub-answer">📎 {{ s.mediaName || 'Fichier média' }}</p>
                        }
                      } @else {
                        <div class="sub-answer sub-options">
                          @for (label of getSelectedLabels(s); track label) {
                            <span class="sub-option-tag">{{ label }}</span>
                          }
                          @if (getSelectedLabels(s).length === 0) {
                            <span class="muted-text">Aucune option sélectionnée</span>
                          }
                        </div>
                      }

                      <div class="sub-meta">
                        <span class="meta-pill">⭐ {{ s.pointsAwarded }} / {{ s.pointsPossible }} pts</span>
                        <span class="meta-date">📅 {{ formatDateTime(s.submittedAt) }}</span>
                        @if (s.reviewedAt) {
                          <span class="meta-date">🔍 {{ formatDateTime(s.reviewedAt) }}</span>
                        }
                        @if (getUnlockedHintsForSub(s).length > 0) {
                          <span class="meta-pill meta-hint">💡 {{ getUnlockedHintsForSub(s).length }} indice(s) débloqué(s)</span>
                        }
                      </div>
                      @if (s.reviewNote) {
                        <div class="sub-note-display">
                          <span class="sub-note-icon">💬</span>
                          <span class="sub-note-text">{{ s.reviewNote }}</span>
                        </div>
                      }
                    </div>

                    <div class="sub-actions">
                      <div class="note-field">
                        <textarea
                          class="note-input"
                          [(ngModel)]="notesDraft[s.id]"
                          placeholder="Remarque (optionnel)..."
                          rows="2"
                        ></textarea>
                      </div>
                      <div class="sub-action-btns">
                        <label class="pts-edit">
                          <span>Points :</span>
                          <input
                            type="number"
                            [(ngModel)]="pointsDraft[s.id]"
                            class="pts-input"
                          />
                        </label>
                        <button
                          type="button"
                          class="btn-approve"
                          (click)="approve(s)"
                        >✅ Approuver</button>
                        <button
                          type="button"
                          class="btn-reject"
                          (click)="reject(s)"
                        >❌ Refuser</button>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }
      </main>
    }

    @if (teamSnack) {
      <div class="team-snack">✅ {{ teamSnack }}</div>
    }
    @if (teamSnackErr) {
      <div class="team-snack team-snack-error">⚠️ {{ teamSnackErr }}</div>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-cream);
      background-image: var(--dot-grid);
    }
    .detail-page {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 20px 60px;
    }

    /* Head */
    .page-head { margin-bottom: 18px; }
    .back-link {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--color-ink);
      opacity: 0.65;
      text-decoration: none;
      display: inline-block;
      margin-bottom: 12px;
    }
    .back-link:hover { opacity: 1; }
    .hunt-name {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(26px, 4vw, 34px);
      color: var(--color-ink);
      margin: 0 0 4px;
      word-break: break-word;
    }
    .hunt-desc {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
    }
    .md-render p { margin: 0 0 0.4em; }
    .md-render p:last-child { margin-bottom: 0; }
    .md-render h1, .md-render h2, .md-render h3 { font-family: 'Fredoka One', cursive; margin: 0.4em 0 0.2em; }
    .md-render ul, .md-render ol { padding-left: 18px; margin: 0 0 0.4em; }
    .md-render strong { font-weight: 800; }
    .md-render a { color: var(--color-sky); }
    .md-render code { font-family: monospace; background: rgba(45,45,45,0.08); padding: 1px 4px; border-radius: 4px; }
    .md-render blockquote { border-left: 3px solid var(--color-coral); margin: 0.3em 0; padding: 2px 10px; }
    .md-render ::ng-deep img, .md-render ::ng-deep video { width: 100%; height: auto; display: block; border-radius: 8px; }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tab {
      font-family: 'Fredoka One', cursive;
      font-size: 14px;
      padding: 10px 18px;
      background: var(--color-paper);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tab:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .tab.active { background: var(--color-coral); color: #fff; }
    .tab-count {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 11px;
      background: rgba(0,0,0,0.12);
      padding: 1px 8px;
      border-radius: 10px;
    }
    .tab.active .tab-count { background: rgba(255,255,255,0.3); }
    .tab-count-alert { background: var(--color-lemon); color: var(--color-ink); }

    /* Cards */
    .card {
      padding: 24px;
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
      margin-bottom: 18px;
    }
    .card h2 {
      font-family: 'Fredoka One', cursive;
      font-size: 18px;
      color: var(--color-ink);
      margin: 0 0 12px;
    }
    .mt { margin-top: 20px; }

    /* Overview */
    .code-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      flex-wrap: wrap;
    }
    .code-display code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 6px;
      color: var(--color-coral);
      flex: 1;
    }
    .btn-copy {
      background: var(--color-sky);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      padding: 8px 14px;
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .status-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .status-badge {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 13px;
      padding: 6px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      color: var(--color-ink);
    }
    .status-mint  { background: #E3F8E6; }
    .status-lemon { background: var(--color-lemon); }
    .status-coral { background: #FFE3E3; }
    .status-sky   { background: #DDF6F5; }

    .status-row-lifecycle { margin-top: 8px; }
    .duration-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700; font-size: 13px;
      padding: 6px 12px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 14px;
      color: var(--color-ink);
    }
    .countdown-live {
      font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px;
      background: var(--color-ink); color: #fff;
      border-color: var(--color-ink); border-radius: 14px;
      letter-spacing: 1px;
    }
    .countdown-live.countdown-urgent { background: var(--color-coral); }

    .btn-lifecycle {
      font-family: 'Fredoka One', cursive; font-size: 13px;
      padding: 8px 16px;
      border: 2px solid var(--color-ink); border-radius: 12px;
      cursor: pointer; box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn-lifecycle:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-lifecycle-start  { background: var(--color-mint);  color: #fff; }
    .btn-lifecycle-finish { background: var(--color-coral); color: #fff; }
    .btn-lifecycle-reset  { background: var(--color-sky);   color: #fff; }
    .btn-toggle {
      background: var(--color-lemon);
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      padding: 8px 14px;
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .btn-toggle:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }

    .stat-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
    }
    .stat {
      padding: 14px;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .stat-coral { background: #FFE3E3; }
    .stat-mint  { background: #E3F8E6; }
    .stat-sky   { background: #DDF6F5; }
    .stat-num {
      font-family: 'Fredoka One', cursive;
      font-size: 26px;
      color: var(--color-ink);
      line-height: 1;
    }
    .stat-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      opacity: 0.7;
    }

    .overview-actions {
      display: flex;
      gap: 12px;
      margin-top: 22px;
      flex-wrap: wrap;
    }
    .btn-action {
      flex: 1;
      min-width: 200px;
      font-family: 'Fredoka One', cursive;
      font-size: 15px;
      padding: 12px 18px;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn-action:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--color-ink); }
    .btn-edit { background: var(--color-lemon); color: var(--color-ink); }
    .btn-play { background: var(--color-coral); color: #fff; }

    /* Teams */
    .teams-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .teams-head h2 { margin: 0; }
    .btn-add {
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      background: var(--color-mint);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      padding: 8px 14px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .btn-add:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }

    .team-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      margin-bottom: 16px;
    }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 11px;
      color: var(--color-ink);
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .field-input {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      padding: 10px 12px;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      background: var(--color-paper);
      outline: none;
      box-sizing: border-box;
    }
    .field-input:focus {
      border-color: var(--color-sky);
      box-shadow: 3px 3px 0 var(--color-sky);
    }
    .code-row { display: flex; gap: 8px; }
    .code-field {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-align: center;
    }
    .btn-generate {
      background: var(--color-sky);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      padding: 0 14px;
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--color-ink);
      white-space: nowrap;
    }
    .btn-submit-form {
      font-family: 'Fredoka One', cursive;
      font-size: 15px;
      padding: 10px 18px;
      background: var(--color-coral);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .error-box {
      background: #FFE3E3;
      border: 2px solid var(--color-coral);
      border-radius: 10px;
      padding: 8px 12px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
    }

    .team-list { display: flex; flex-direction: column; gap: 10px; }
    .team-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
    }
    .team-info { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
    .team-name {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 15px;
      color: var(--color-ink);
    }
    .team-code-row { display: flex; align-items: center; gap: 8px; }
    .team-code {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 2px;
      color: var(--color-coral);
      background: rgba(255,107,107,0.1);
      padding: 2px 8px;
      border-radius: 6px;
    }
    .btn-mini {
      background: var(--color-paper);
      border: 2px solid var(--color-ink);
      border-radius: 8px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-delete-team {
      background: var(--color-paper);
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      padding: 8px 12px;
      cursor: pointer;
      color: var(--color-coral);
      font-size: 14px;
    }

    /* Moderation */
    .mod-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .mod-head h2 { margin: 0; }
    .btn-refresh {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      background: var(--color-paper);
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .pill {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 12px;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      background: var(--color-paper);
      cursor: pointer;
      transition: transform 0.1s;
    }
    .pill:hover { transform: translate(-1px,-1px); }
    .pill.active { box-shadow: 3px 3px 0 var(--color-ink); transform: none; }
    .pill-lemon.active { background: var(--color-lemon); }
    .pill-mint.active  { background: #E3F8E6; }
    .pill-coral.active { background: #FFE3E3; }

    .sub-list { display: flex; flex-direction: column; gap: 12px; }
    .sub-card {
      padding: 14px 16px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sub-card.is-pending { background: #FFFBE0; }
    .sub-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .sub-head-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
    .sub-icon { font-size: 22px; line-height: 1; flex-shrink: 0; }
    .sub-titles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .sub-team {
      font-family: 'Fredoka One', cursive;
      font-size: 15px;
      color: var(--color-ink);
    }
    .sub-step {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      opacity: 0.7;
    }
    .sub-question {
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      color: var(--color-ink);
      opacity: 0.75;
      margin: 0;
      padding: 8px 12px;
      background: rgba(45,45,45,0.04);
      border-left: 3px solid var(--color-sky);
      border-radius: 0 8px 8px 0;
      line-height: 1.5;
      font-style: italic;
    }
    .sub-answer {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      color: var(--color-ink);
      margin: 0;
      padding: 10px 12px;
      background: var(--color-paper);
      border: 2px solid rgba(45,45,45,0.12);
      border-radius: 10px;
      line-height: 1.5;
      word-break: break-word;
    }
    .sub-media-link { display: block; }
    .sub-media-img {
      width: 100%;
      max-height: 240px;
      object-fit: cover;
      border-radius: 10px;
      border: 2px solid var(--color-ink);
      display: block;
      cursor: zoom-in;
    }
    .sub-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .sub-option-tag {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      padding: 4px 10px;
      background: #DDF6F5;
      color: var(--color-ink);
      border: 2px solid var(--color-ink);
      border-radius: 10px;
    }
    .muted-text {
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      opacity: 0.5;
    }
    .sub-meta { display: flex; gap: 10px; flex-wrap: wrap; }
    .meta-pill {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 12px;
      background: var(--color-lemon);
      padding: 3px 10px;
      border-radius: 10px;
      border: 2px solid var(--color-ink);
    }
    .meta-hint { background: #FFFBE0; }
    .meta-date {
      font-family: 'Nunito', sans-serif;
      font-size: 12px;
      opacity: 0.7;
    }
    .sub-note-display {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 12px;
      background: #FFFBE0;
      border: 2px solid rgba(45,45,45,0.15);
      border-radius: 10px;
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      color: var(--color-ink);
      line-height: 1.5;
    }
    .sub-note-icon { flex-shrink: 0; }
    .sub-note-text { flex: 1; }

    .sub-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sub-action-btns {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .note-field { display: flex; }
    .note-input {
      flex: 1;
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      padding: 8px 12px;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      background: var(--color-paper);
      outline: none;
      resize: vertical;
      line-height: 1.5;
      box-sizing: border-box;
      width: 100%;
    }
    .note-input:focus { border-color: var(--color-sky); box-shadow: 3px 3px 0 var(--color-sky); }
    .pts-edit {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
    }
    .pts-input {
      width: 70px;
      padding: 6px 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      border: 2px solid var(--color-ink);
      border-radius: 8px;
      background: var(--color-paper);
      outline: none;
      text-align: center;
    }
    .btn-approve, .btn-reject {
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      padding: 8px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .btn-approve { background: var(--color-mint); color: #fff; }
    .btn-reject { background: var(--color-coral); color: #fff; }
    .sub-footer {
      font-family: 'Nunito', sans-serif;
      font-size: 11px;
      opacity: 0.6;
    }

    .empty-inline {
      text-align: center;
      padding: 30px 20px;
      font-family: 'Nunito', sans-serif;
      color: var(--color-ink);
    }
    .empty-inline p { margin: 0 0 4px; }
    .empty-inline .muted { font-size: 13px; opacity: 0.6; }

    /* ── Team snackbar ── */
    .team-snack {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
      background: var(--color-mint); color: #fff;
      border: 3px solid var(--color-ink); border-radius: 20px;
      padding: 12px 28px;
      font-family: 'Fredoka One', cursive; font-size: 17px;
      box-shadow: 4px 4px 0 var(--color-ink);
      z-index: 2000; pointer-events: none; white-space: nowrap;
      animation: teamSnackIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes teamSnackIn {
      from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.9); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
    }
    .team-snack-error { background: var(--color-coral); bottom: 76px; }

    @media (max-width: 480px) {
      .detail-page { padding: 18px 14px 40px; }
      .card { padding: 18px 16px; }
      .code-display code { font-size: 22px; letter-spacing: 4px; }
    }
  `],
})
export class HuntDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly cdr = inject(ChangeDetectorRef);

  hunt: Hunt | null = null;
  tab: TabId = 'overview';

  teams: Team[] = [];
  showTeamForm = false;
  newTeamName = '';
  newTeamCode = '';
  teamErrorMsg = '';
  teamSnack = '';
  teamSnackErr = '';
  private teamSnackTimer?: ReturnType<typeof setTimeout>;
  private teamSnackErrTimer?: ReturnType<typeof setTimeout>;

  submissions: AnswerSubmission[] = [];
  attemptCounts: Map<string, number> = new Map();
  filter: FilterId = 'all';
  pointsDraft: Record<string, number> = {};
  notesDraft: Record<string, string> = {};

  codeCopied = false;

  countdownDisplay = '';
  countdownUrgent = false;
  private countdownInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.storage.getHuntById(id).then(hunt => {
      if (!hunt) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.hunt = hunt;
      if (hunt.status === 'started') this.startDetailCountdown();
      this.cdr.markForCheck();
      this.refreshTeams();
      this.refreshSubmissions();
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    clearTimeout(this.teamSnackTimer);
    clearTimeout(this.teamSnackErrTimer);
  }

  get totalEnigmas(): number {
    return this.hunt?.steps.reduce((sum, s) => sum + s.enigmas.length, 0) ?? 0;
  }

  get pendingCount(): number {
    return this.submissions.filter(s => s.status === 'pending').length;
  }

  get filteredSubmissions(): AnswerSubmission[] {
    if (this.filter === 'all') return this.submissions;
    return this.submissions.filter(s => s.status === this.filter);
  }

  setTab(tab: TabId): void {
    this.tab = tab;
  }

  setFilter(filter: FilterId): void {
    this.filter = filter;
  }

  countByStatus(status: AnswerStatus): number {
    return this.submissions.filter(s => s.status === status).length;
  }

  formatDateTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    this.codeCopied = true;
    setTimeout(() => { this.codeCopied = false; }, 1500);
  }

  // ── Hunt lifecycle ────────────────────────────────────────────────

  get huntStatusBadgeClass(): string {
    switch (this.hunt?.status) {
      case 'ready':    return 'status-sky';
      case 'started':  return 'status-coral';
      case 'finished': return 'status-mint';
      default:         return 'status-lemon';
    }
  }

  get huntStatusBadgeLabel(): string {
    switch (this.hunt?.status) {
      case 'ready':    return '🟢 Prêt';
      case 'started':  return '▶ En cours';
      case 'finished': return '🏁 Terminé';
      default:         return '📝 Brouillon';
    }
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  }

  async doStartHunt(): Promise<void> {
    if (!this.hunt) return;
    this.hunt = await this.storage.startHunt(this.hunt.id);
    this.startDetailCountdown();
    this.cdr.markForCheck();
  }

  async doFinishHunt(): Promise<void> {
    if (!this.hunt) return;
    this.hunt = await this.storage.finishHunt(this.hunt.id);
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = undefined; }
    this.countdownDisplay = '';
    this.cdr.markForCheck();
  }

  async doResetHunt(): Promise<void> {
    if (!this.hunt) return;
    this.hunt = await this.storage.resetHunt(this.hunt.id);
    this.startDetailCountdown();
    this.cdr.markForCheck();
  }

  private startDetailCountdown(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (!this.hunt?.durationSeconds || !this.hunt.startedAt) {
      this.countdownDisplay = '';
      return;
    }
    const tick = () => {
      if (!this.hunt?.startedAt || !this.hunt.durationSeconds) return;
      const endMs = new Date(this.hunt.startedAt).getTime() + this.hunt.durationSeconds * 1000;
      const remainMs = endMs - Date.now();
      if (remainMs <= 0) {
        this.countdownDisplay = '00:00:00';
        this.countdownUrgent = false;
        clearInterval(this.countdownInterval);
        this.countdownInterval = undefined;
        this.cdr.markForCheck();
        return;
      }
      const totalSec = Math.ceil(remainMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      this.countdownDisplay = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
      this.countdownUrgent = totalSec <= 60;
      this.cdr.markForCheck();
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
  }

  async togglePublished(): Promise<void> {
    if (!this.hunt) return;
    const updated: Hunt = { ...this.hunt, published: !this.hunt.published };
    await this.storage.saveHunt(updated);
    this.hunt = updated;
    this.cdr.markForCheck();
  }

  goToEdit(): void {
    if (!this.hunt) return;
    this.router.navigate(['/dashboard/hunt', this.hunt.id, 'edit']);
  }

  goToPlay(): void {
    if (!this.hunt) return;
    const firstTeam = this.teams[0];
    if (!firstTeam) return;
    this.router.navigate(['/play', firstTeam.accessCode]);
  }

  // ── Teams ─────────────────────────────────────────────────────────

  private async refreshTeams(): Promise<void> {
    if (!this.hunt) return;
    this.teams = await this.storage.getTeamsForHunt(this.hunt.id);
    this.cdr.markForCheck();
  }

  private generateTeamCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  private generateTeamId(): string {
    return `team-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  normalizeCode(value: string): void {
    this.newTeamCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    this.teamErrorMsg = '';
  }

  generateCode(): void {
    this.newTeamCode = this.generateTeamCode();
    this.teamErrorMsg = '';
  }

  private showTeamSnack(msg: string): void {
    clearTimeout(this.teamSnackTimer);
    this.teamSnack = msg;
    this.cdr.markForCheck();
    this.teamSnackTimer = setTimeout(() => { this.teamSnack = ''; this.cdr.markForCheck(); }, 2500);
  }

  private showTeamSnackErr(msg: string): void {
    clearTimeout(this.teamSnackErrTimer);
    this.teamSnackErr = msg;
    this.cdr.markForCheck();
    this.teamSnackErrTimer = setTimeout(() => { this.teamSnackErr = ''; this.cdr.markForCheck(); }, 3500);
  }

  async addTeam(): Promise<void> {
    if (!this.hunt) return;

    const name = this.newTeamName.trim();
    if (!name) {
      this.showTeamSnackErr('Le nom de l\'équipe est requis.');
      return;
    }

    const code = this.newTeamCode.trim() || this.generateTeamCode();
    if (code.length < 4) {
      this.showTeamSnackErr('Le code doit faire au moins 4 caractères.');
      return;
    }

    const conflict = await this.storage.getTeamByCode(code);
    if (conflict) {
      this.showTeamSnackErr('Ce code est déjà utilisé.');
      return;
    }

    const team: Team = {
      id: this.generateTeamId(),
      huntId: this.hunt.id,
      name,
      accessCode: code,
      createdAt: new Date().toISOString(),
    };

    const next = [...this.teams, team];
    await this.storage.saveTeamsForHunt(this.hunt.id, next);
    this.teams = next;
    this.newTeamName = '';
    this.newTeamCode = '';
    this.showTeamForm = false;
    this.showTeamSnack(`Équipe "${name}" ajoutée (code : ${code})`);
  }

  async deleteTeam(team: Team): Promise<void> {
    if (!this.hunt) return;
    if (!confirm(`Supprimer l'équipe "${team.name}" ?`)) return;
    await this.storage.deleteTeam(this.hunt.id, team.id);
    await this.refreshTeams();
  }

  // ── Submissions ───────────────────────────────────────────────────

  async refreshSubmissions(): Promise<void> {
    if (!this.hunt) return;
    [this.submissions, this.attemptCounts] = await Promise.all([
      this.storage.getSubmissions(this.hunt.id),
      this.storage.getAllAttemptCounts(this.hunt.id),
    ]);
    for (const s of this.submissions) {
      if (this.pointsDraft[s.id] === undefined) {
        this.pointsDraft[s.id] = s.pointsAwarded > 0 ? s.pointsAwarded : s.pointsPossible;
      }
      if (this.notesDraft[s.id] === undefined) {
        this.notesDraft[s.id] = s.reviewNote ?? '';
      }
    }
    this.cdr.markForCheck();
  }

  getUnlockedHintsForSub(sub: AnswerSubmission): Hint[] {
    if (!this.hunt) return [];
    const wrongCount = this.attemptCounts.get(`${sub.teamId}:${sub.enigmaId}`) ?? 0;
    for (const step of this.hunt.steps) {
      const enigma = step.enigmas.find(e => e.id === sub.enigmaId);
      if (enigma) return (enigma.hints ?? []).filter(h => wrongCount >= h.unlockAfterAttempts);
    }
    return [];
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'text': return '✏️';
      case 'media': return '📷';
      case 'radio': return '🔘';
      case 'checkbox': return '☑️';
      default: return '❔';
    }
  }

  statusLabel(s: AnswerStatus): string {
    switch (s) {
      case 'pending': return '⏳ En attente';
      case 'approved': return '✅ Approuvé';
      case 'rejected': return '❌ Refusé';
    }
  }

  statusClass(s: AnswerStatus): string {
    switch (s) {
      case 'pending': return 'status-lemon';
      case 'approved': return 'status-mint';
      case 'rejected': return 'status-coral';
    }
  }

  isMediaUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
  }

  getEnigmaDescription(sub: AnswerSubmission): string {
    if (!this.hunt) return '';
    for (const step of this.hunt.steps) {
      for (const enigma of step.enigmas) {
        if (enigma.id === sub.enigmaId) return enigma.description;
      }
    }
    return '';
  }

  getSelectedLabels(sub: AnswerSubmission): string[] {
    if (!this.hunt) return [];
    for (const step of this.hunt.steps) {
      for (const enigma of step.enigmas) {
        if (enigma.id === sub.enigmaId) {
          return sub.selectedOptionIds
            .map(id => enigma.answer.options.find(o => o.id === id)?.label ?? id);
        }
      }
    }
    return [...sub.selectedOptionIds];
  }

  async approve(sub: AnswerSubmission): Promise<void> {
    const raw = this.pointsDraft[sub.id];
    const pts = Number.isFinite(raw) ? Number(raw) : sub.pointsPossible;
    const updated: AnswerSubmission = {
      ...sub,
      status: 'approved',
      pointsAwarded: pts,
      reviewedAt: new Date().toISOString(),
      reviewNote: this.notesDraft[sub.id]?.trim() || undefined,
    };
    await this.storage.saveSubmission(updated);
    await this.refreshSubmissions();
  }

  async reject(sub: AnswerSubmission): Promise<void> {
    const updated: AnswerSubmission = {
      ...sub,
      status: 'rejected',
      pointsAwarded: 0,
      reviewedAt: new Date().toISOString(),
      reviewNote: this.notesDraft[sub.id]?.trim() || undefined,
    };
    await this.storage.saveSubmission(updated);
    // Text and media wrong attempts are tracked when admin rejects
    if (sub.type === 'text' || sub.type === 'media') {
      await this.storage.incrementWrongAttempt(sub.huntId, sub.enigmaId, sub.teamId);
    }
    await this.refreshSubmissions();
  }
}
