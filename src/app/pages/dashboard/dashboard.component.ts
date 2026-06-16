import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { Hunt } from '../../../types';
import { DashNavComponent } from '../../components/dash-nav/dash-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DashNavComponent],
  template: `
    <app-dash-nav></app-dash-nav>

    <main class="dashboard" [class.hidden]="navigating">
      <header class="dash-header">
        <div class="dash-title-wrap">
          <h1>Mes chasses</h1>
          <p>Gérez vos parcours et suivez vos joueurs.</p>
        </div>
        <button type="button" class="btn-create" (click)="createHunt()">
          + Nouvelle chasse
        </button>
      </header>

      <!-- Stats -->
      <section class="stats-row">
        <div class="stat-card stat-coral">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">Chasses au total</span>
        </div>
        <div class="stat-card stat-mint">
          <span class="stat-num">{{ stats.published }}</span>
          <span class="stat-label">Publiées</span>
        </div>
        <div class="stat-card stat-lemon">
          <span class="stat-num">{{ stats.drafts }}</span>
          <span class="stat-label">Brouillons</span>
        </div>
      </section>

      <!-- Loading state -->
      @if (loading) {
        <div class="loading-wrap">
          <div class="spinner"></div>
          <p class="loading-label">Chargement des chasses…</p>
        </div>
      }

      <!-- Hunt grid -->
      @if (!loading) {
        @if (hunts.length === 0) {
          <div class="empty">
            <div class="empty-emoji">🗺️</div>
            <h2>Aucune chasse pour l'instant</h2>
            <p>Créez votre première chasse au trésor en quelques clics.</p>
            <button type="button" class="btn-create big" (click)="createHunt()">
              + Créer ma première chasse
            </button>
          </div>
        } @else {
          <section class="hunt-grid">
            @for (h of hunts; track h.id) {
              <article class="hunt-card" [class.is-deleting]="deleting === h.id">
                <div class="card-top">
                  <div class="badges">
                    @if (h.published) {
                      <span class="badge badge-mint">✅ Publié</span>
                    } @else {
                      <span class="badge badge-lemon">📝 Brouillon</span>
                    }
                  </div>
                  <h3 class="hunt-name">{{ h.name || 'Sans nom' }}</h3>
                  @if (h.description) {
                    <p class="hunt-desc">{{ h.description }}</p>
                  }
                </div>

                <div class="card-meta">
                  <div class="meta-item">
                    <span class="meta-label">Étapes</span>
                    <span class="meta-val">{{ h.steps.length }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Créée le</span>
                    <span class="meta-val">{{ formatDate(h.createdAt) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">👥 Équipes</span>
                    <span class="meta-val">{{ getHuntStats(h.id).teamsPlayed }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">💬 Réponses</span>
                    <span class="meta-val">{{ getHuntStats(h.id).totalAnswers }}</span>
                  </div>
                </div>

                <div class="card-actions">
                  <button
                    type="button"
                    class="btn-card btn-detail"
                    [disabled]="!!deleting"
                    (click)="goToDetail(h.id)"
                  >Détail</button>
                  <button
                    type="button"
                    class="btn-card btn-edit"
                    [disabled]="!!deleting"
                    (click)="goToEdit(h.id)"
                  >Modifier</button>
                  <button
                    type="button"
                    class="btn-card btn-delete"
                    [disabled]="!!deleting"
                    (click)="deleteHunt(h)"
                    title="Supprimer"
                  >
                    @if (deleting === h.id) {
                      <span class="btn-spinner"></span>
                    } @else {
                      🗑️
                    }
                  </button>
                </div>
              </article>
            }
          </section>
        }
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-cream);
      background-image: var(--dot-grid);
    }
    .hidden { visibility: hidden; }
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 28px 20px 60px;
    }

    /* Header */
    .dash-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .dash-title-wrap h1 {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(26px, 4vw, 36px);
      color: var(--color-ink);
      margin: 0 0 4px;
    }
    .dash-title-wrap p {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
    }
    .btn-create {
      font-family: 'Fredoka One', cursive;
      font-size: 16px;
      padding: 12px 22px;
      background: var(--color-coral);
      color: #fff;
      border: 3px solid var(--color-ink);
      border-radius: 16px;
      box-shadow: 5px 5px 0 var(--color-ink);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      white-space: nowrap;
    }
    .btn-create:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 var(--color-ink); }
    .btn-create:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--color-ink); }
    .btn-create.big { font-size: 18px; padding: 16px 28px; margin-top: 12px; }

    /* Stats row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .stat-card {
      padding: 18px 20px;
      border: 3px solid var(--color-ink);
      border-radius: 18px;
      box-shadow: 5px 5px 0 var(--color-ink);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-coral { background: #FFE3E3; }
    .stat-mint  { background: #E3F8E6; }
    .stat-lemon { background: var(--color-lemon); }
    .stat-num {
      font-family: 'Fredoka One', cursive;
      font-size: 32px;
      color: var(--color-ink);
      line-height: 1;
    }
    .stat-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
      color: var(--color-ink);
      opacity: 0.75;
    }

    /* Empty state */
    .empty {
      text-align: center;
      padding: 60px 24px;
      background: var(--color-paper);
      border: 3px dashed var(--color-ink);
      border-radius: 20px;
    }
    .empty-emoji { font-size: 64px; line-height: 1; margin-bottom: 12px; }
    .empty h2 {
      font-family: 'Fredoka One', cursive;
      font-size: 24px;
      color: var(--color-ink);
      margin: 0 0 8px;
    }
    .empty p {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
    }

    /* Hunt grid */
    .hunt-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }
    .hunt-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px;
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .hunt-card:hover {
      transform: translate(-2px, -2px);
      box-shadow: 8px 8px 0 var(--color-ink);
    }


    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .badge {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 10px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      color: var(--color-ink);
      letter-spacing: 0.2px;
    }
    .badge-mint  { background: #E3F8E6; }
    .badge-lemon { background: var(--color-lemon); }
    .badge-sky   { background: #DDF6F5; }

    .hunt-name {
      font-family: 'Fredoka One', cursive;
      font-size: 20px;
      color: var(--color-ink);
      margin: 0 0 4px;
      word-break: break-word;
    }
    .hunt-desc {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-meta {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 10px;
      padding: 12px;
      background: var(--color-cream);
      border: 2px solid rgba(45,45,45,0.12);
      border-radius: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .meta-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 10px;
      color: var(--color-ink);
      opacity: 0.55;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .meta-val {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 14px;
      color: var(--color-ink);
    }

    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
    }
    .btn-card {
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      padding: 9px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      flex: 1;
    }
    .btn-card:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-card:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--color-ink); }
    .btn-detail { background: var(--color-sky); color: #fff; }
    .btn-edit   { background: var(--color-lemon); color: var(--color-ink); }
    .btn-delete {
      flex: 0 0 auto;
      background: #e03030;
      color: #fff;
      border-color: #c02020;
      padding: 9px 12px;
    }
    .btn-delete:hover { background: #c02020; border-color: #a01010; box-shadow: 3px 3px 0 #600; }

    /* Loading */
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 24px;
    }
    .loading-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 15px;
      color: var(--color-ink);
      opacity: 0.6;
      margin: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(45,45,45,0.12);
      border-top-color: var(--color-coral);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
    }

    /* Deleting card */
    .hunt-card.is-deleting {
      opacity: 0.5;
      pointer-events: none;
    }
    .btn-card:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    @media (max-width: 480px) {
      .dashboard { padding: 20px 14px 40px; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  hunts: Hunt[] = [];
  stats = { total: 0, published: 0, drafts: 0 };
  huntStats: Map<string, { teamsPlayed: number; totalAnswers: number }> = new Map();
  navigating = false;
  loading = false;
  deleting: string | null = null;

  ngOnInit(): void {
    this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    this.hunts = await this.storage.getHunts(this.auth.user()?.id);
    this.stats = {
      total: this.hunts.length,
      published: this.hunts.filter(h => h.published).length,
      drafts: this.hunts.filter(h => !h.published).length,
    };
    this.huntStats = await this.storage.getHuntsBatchStats(this.hunts.map(h => h.id));
    this.loading = false;
    this.cdr.markForCheck();
  }

  getHuntStats(id: string): { teamsPlayed: number; totalAnswers: number } {
    return this.huntStats.get(id) ?? { teamsPlayed: 0, totalAnswers: 0 };
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }

  createHunt(): void {
    this.navigating = true;
    this.router.navigate(['/dashboard/hunt', 'new', 'edit']);
  }

  goToDetail(id: string): void {
    this.navigating = true;
    this.router.navigate(['/dashboard/hunt', id]);
  }

  goToEdit(id: string): void {
    this.navigating = true;
    this.router.navigate(['/dashboard/hunt', id, 'edit']);
  }

  async deleteHunt(hunt: Hunt): Promise<void> {
    if (!confirm(`Supprimer la chasse "${hunt.name || 'Sans nom'}" ?`)) return;
    this.deleting = hunt.id;
    this.cdr.markForCheck();
    await this.storage.deleteHunt(hunt.id);
    this.deleting = null;
    await this.refresh();
  }
}
