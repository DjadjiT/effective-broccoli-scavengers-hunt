import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { StorageService } from '../../services/storage.service';
import { HuntService } from '../../services/hunt.service';
import { Hunt, Step } from '../../../types';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';
import { MapComponent } from '../../components/map/map.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { StepCardComponent } from '../../components/step-card/step-card.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LanguageToggleComponent,
    MapComponent,
    ModalComponent,
    StepCardComponent,
  ],
  template: `
    <div class="admin-page">

      <!-- ── Header ── -->
      <header class="admin-header">
        <a routerLink="/" class="back-btn">← Accueil</a>
        <span class="admin-title">🏗️ Admin</span>
        <app-language-toggle></app-language-toggle>
      </header>

      <div class="admin-body">

        <!-- ═══════════════════════════════════════
             LEFT COLUMN — Form
        ═══════════════════════════════════════ -->
        <section class="form-col">

          <!-- Hunt meta -->
          <div class="card">
            <h2 class="section-title">🗺️ {{ hunt.id ? 'Modifier la chasse' : 'Nouvelle chasse' }}</h2>
            <div class="field">
              <label>{{ i18n.t('huntName') }}</label>
              <input type="text" [(ngModel)]="hunt.name"
                [placeholder]="i18n.t('huntName')" class="field-input" />
            </div>
            <div class="field">
              <label>{{ i18n.t('description') }}</label>
              <textarea [(ngModel)]="hunt.description"
                [placeholder]="i18n.t('description')"
                class="field-input" rows="2"></textarea>
            </div>
          </div>

          <!-- ── Vertical step carousel ── -->
          <div class="steps-panel">

            <!-- Steps toolbar -->
            <div class="steps-toolbar">
              <span class="steps-count">
                {{ hunt.steps.length }} étape{{ hunt.steps.length > 1 ? 's' : '' }}
              </span>

              <!-- Nav dots -->
              @if (hunt.steps.length > 1) {
                <div class="nav-dots">
                  @for (s of hunt.steps; track s.id; let i = $index) {
                    <button
                      class="nav-dot"
                      [class.active]="activeStep === i"
                      [title]="s.title || ('Étape ' + (i + 1))"
                      (click)="goToStep(i)"
                    ></button>
                  }
                </div>
              }

              <button class="btn-add-step" (click)="addStep()">
                + {{ i18n.t('addStep') }}
              </button>
            </div>

            <!-- Pick mode banner -->
            @if (pickModeStepIndex !== null) {
              <div class="pick-banner">
                🎯 Cliquez sur la carte pour placer l'étape {{ pickModeStepIndex + 1 }}
                <button (click)="cancelPickMode()">Annuler</button>
              </div>
            }

            <!-- Carousel container -->
            <div class="steps-carousel" #carousel>
              @for (step of hunt.steps; track step.id; let i = $index) {
                <app-step-card
                  [id]="'step-card-' + i"
                  [step]="step"
                  [index]="i"
                  [total]="hunt.steps.length"
                  [isActive]="activeStep === i"
                  (stepChange)="updateStep(i, $event)"
                  (delete)="removeStep(i)"
                  (moveUp)="moveStep(i, -1)"
                  (moveDown)="moveStep(i, 1)"
                  (requestPickMode)="startPickMode(i)"
                  (prevStep)="goToStep(i - 1)"
                  (nextStep)="goToStep(i + 1)"
                  (click)="setActive(i)"
                ></app-step-card>
              }
            </div>
          </div>

          <!-- Actions -->
          <div class="action-row">
            <button class="btn-draft" (click)="saveDraft()">
              💾 {{ i18n.t('saveDraft') }}
            </button>
            <button class="btn-publish" (click)="publish()">
              🚀 {{ i18n.t('publish') }}
            </button>
          </div>

          <!-- Saved hunts list -->
          <div class="card hunts-list">
            <h3 class="section-title">📋 {{ i18n.t('savedDrafts') }}</h3>
            @if (allHunts.length === 0) {
              <p class="empty">{{ i18n.t('noHunts') }}</p>
            }
            @for (h of allHunts; track h.id) {
              <div class="hunt-row">
                <div class="hunt-info">
                  <span class="hunt-name">{{ h.name || 'Sans nom' }}</span>
                  <span class="hunt-meta">
                    <code>{{ h.accessCode }}</code>
                    · {{ h.steps.length }} étapes
                    · {{ h.published ? '✅ publié' : '📝 brouillon' }}
                  </span>
                </div>
                <div class="hunt-actions">
                  <button class="btn-sm" (click)="editHunt(h)">✏️</button>
                  <button class="btn-sm danger" (click)="deleteHunt(h.id)">🗑️</button>
                </div>
              </div>
            }
          </div>

        </section>

        <!-- ═══════════════════════════════════════
             RIGHT COLUMN — Map
        ═══════════════════════════════════════ -->
        <section class="map-col">
          <div class="card map-card">
            <h3 class="section-title">🗺️ {{ i18n.t('mapPreview') }}</h3>
            @if (hunt.steps.length > 0) {
              <div class="map-wrap">
                <app-map
                  [steps]="hunt.steps"
                  [activeStepIndex]="activeStep"
                  [completedStepIds]="[]"
                  [pickMode]="pickModeStepIndex !== null"
                  (mapClick)="onMapClick($event)"
                  (markerClick)="goToStep($event)"
                ></app-map>
              </div>
            } @else {
              <div class="map-empty">
                <span>🗺️</span>
                <p>{{ i18n.t('addStepToSeeMap') }}</p>
              </div>
            }
          </div>
        </section>

      </div>
    </div>

    <!-- ── Publish modal ── -->
    <app-modal [visible]="showPublishModal" (close)="showPublishModal = false">
      <div class="publish-modal">
        <div class="modal-icon">🎉</div>
        <h2>Chasse publiée !</h2>
        <p>{{ i18n.t('shareCode') }}</p>
        <div class="code-display">
          <code>{{ publishedCode }}</code>
          <button class="btn-copy" (click)="copyCode()">
            {{ codeCopied ? '✓ ' + i18n.t('codeCopied') : i18n.t('copyCode') }}
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn-draft" (click)="resetForm()">{{ i18n.t('createAnother') }}</button>
          <a class="btn-publish" [href]="'/play/' + publishedCode">{{ i18n.t('goToPlay') }}</a>
        </div>
      </div>
    </app-modal>
  `,
  styles: [`
    /* ── Page ── */
    .admin-page {
      min-height: 100vh;
      background: var(--color-cream);
      background-image: var(--dot-grid);
    }
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--color-paper);
      border-bottom: 3px solid var(--color-ink);
      position: sticky;
      top: 0;
      z-index: 300;
    }
    .back-btn {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      color: var(--color-ink);
      text-decoration: none;
      font-size: 15px;
    }
    .admin-title {
      font-family: 'Fredoka One', cursive;
      font-size: 20px;
    }

    /* ── Grid ── */
    .admin-body {
      display: grid;
      grid-template-columns: 55% 45%;
      gap: 24px;
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      align-items: flex-start;
    }
    @media (max-width: 900px) {
      .admin-body { grid-template-columns: 1fr; }
    }

    /* ── Cards ── */
    .card {
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
      padding: 24px;
      margin-bottom: 20px;
    }
    .section-title {
      font-family: 'Fredoka One', cursive;
      font-size: 20px;
      margin: 0 0 20px;
      color: var(--color-ink);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .field label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      color: var(--color-ink);
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-input {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      padding: 10px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      background: var(--color-cream);
      color: var(--color-ink);
      outline: none;
      resize: vertical;
      transition: border-color 0.14s, box-shadow 0.14s;
    }
    .field-input:focus {
      border-color: var(--color-sky);
      box-shadow: 3px 3px 0 var(--color-sky);
    }

    /* ── Steps panel ── */
    .steps-panel {
      margin-bottom: 20px;
    }

    /* Toolbar */
    .steps-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .steps-count {
      font-family: 'Fredoka One', cursive;
      font-size: 15px;
      color: var(--color-ink);
      opacity: 0.65;
    }
    .nav-dots {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      flex: 1;
    }
    .nav-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 2px solid var(--color-ink);
      background: var(--color-cream);
      cursor: pointer;
      padding: 0;
      transition: all 0.14s;
      flex-shrink: 0;
    }
    .nav-dot.active {
      background: var(--color-coral);
      transform: scale(1.35);
    }
    .btn-add-step {
      background: var(--color-lemon);
      border: 2px solid var(--color-ink);
      border-radius: 20px;
      padding: 8px 18px;
      font-family: 'Fredoka One', cursive;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      white-space: nowrap;
      margin-left: auto;
    }
    .btn-add-step:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--color-ink);
    }
    .btn-add-step:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 var(--color-ink);
    }

    /* Pick mode banner */
    .pick-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--color-lemon);
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      padding: 10px 16px;
      margin-bottom: 14px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .pick-banner button {
      background: var(--color-ink);
      color: var(--color-lemon);
      border: none;
      border-radius: 10px;
      padding: 5px 12px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      flex-shrink: 0;
    }

    /* Carousel */
    .steps-carousel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    @media (max-width: 900px) {
      .steps-carousel {
        /* Snap to each card on mobile */
        overflow-x: hidden;
      }
    }

    /* ── Action row ── */
    .action-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn-draft, .btn-publish {
      flex: 1;
      padding: 12px 20px;
      border: 3px solid var(--color-ink);
      border-radius: 16px;
      font-family: 'Fredoka One', cursive;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 4px 4px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      text-decoration: none;
      text-align: center;
    }
    .btn-draft { background: var(--color-lemon); color: var(--color-ink); }
    .btn-publish { background: var(--color-coral); color: #fff; }
    .btn-draft:hover, .btn-publish:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 var(--color-ink);
    }
    .btn-draft:active, .btn-publish:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--color-ink);
    }

    /* ── Hunts list ── */
    .hunt-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(45,45,45,0.1);
    }
    .hunt-info { display: flex; flex-direction: column; gap: 4px; }
    .hunt-name { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 15px; }
    .hunt-meta { font-family: 'Nunito', sans-serif; font-size: 12px; opacity: 0.6; }
    .hunt-meta code {
      font-family: 'JetBrains Mono', monospace;
      background: var(--color-cream);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .hunt-actions { display: flex; gap: 6px; }
    .btn-sm {
      padding: 6px 10px;
      border: 2px solid var(--color-ink);
      border-radius: 10px;
      background: var(--color-cream);
      cursor: pointer;
      font-size: 14px;
    }
    .btn-sm.danger { border-color: #e03; }
    .empty { font-family: 'Nunito', sans-serif; opacity: 0.5; }

    /* ── Map column ── */
    .map-col { position: sticky; top: 80px; }
    .map-card { height: calc(100vh - 130px); display: flex; flex-direction: column; }
    .map-wrap {
      flex: 1;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid var(--color-ink);
    }
    .map-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      opacity: 0.35;
      font-size: 48px;
    }
    .map-empty p { font-family: 'Nunito', sans-serif; font-size: 15px; }
    @media (max-width: 900px) {
      .map-col { position: static; }
      .map-card { height: auto; }
      .map-wrap { height: 320px; }
    }

    /* ── Publish modal ── */
    .publish-modal { text-align: center; }
    .modal-icon { font-size: 64px; margin-bottom: 8px; }
    .publish-modal h2 { font-family: 'Fredoka One', cursive; font-size: 28px; margin: 0 0 8px; }
    .publish-modal p { font-family: 'Nunito', sans-serif; opacity: 0.7; margin: 0 0 20px; }
    .code-display {
      background: var(--color-cream);
      border: 3px solid var(--color-ink);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .code-display code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: var(--color-coral);
    }
    .btn-copy {
      background: var(--color-sky);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      padding: 8px 20px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      cursor: pointer;
    }
    .modal-actions { display: flex; gap: 12px; }
  `],
})
export class AdminComponent implements OnInit {
  hunt!: Hunt;
  activeStep = 0;
  pickModeStepIndex: number | null = null;
  showPublishModal = false;
  publishedCode = '';
  codeCopied = false;
  allHunts: Hunt[] = [];

  constructor(
    public i18n: I18nService,
    private storage: StorageService,
    private huntService: HuntService,
  ) {}

  ngOnInit(): void {
    this.resetForm();
    this.refreshHunts();
  }

  resetForm(): void {
    this.hunt = this.huntService.createEmptyHunt();
    this.activeStep = 0;
    this.pickModeStepIndex = null;
    this.showPublishModal = false;
  }

  refreshHunts(): void {
    this.allHunts = this.storage.getHunts().filter(h => h.id !== 'demo-paris-1');
  }

  // ── Step carousel navigation ──────────────────────────────────────

  setActive(index: number): void {
    this.activeStep = index;
  }

  goToStep(index: number): void {
    this.activeStep = index;
    setTimeout(() => {
      const el = document.getElementById(`step-card-${index}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 10);
  }

  // ── Step CRUD ─────────────────────────────────────────────────────

  updateStep(index: number, updated: Step): void {
    const steps = [...this.hunt.steps];
    steps[index] = updated;
    this.hunt = { ...this.hunt, steps };
  }

  addStep(): void {
    const newStep = this.huntService.createEmptyStep();
    this.hunt = { ...this.hunt, steps: [...this.hunt.steps, newStep] };
    const newIndex = this.hunt.steps.length - 1;
    this.goToStep(newIndex);
  }

  removeStep(index: number): void {
    if (this.hunt.steps.length <= 1) return;
    const steps = this.hunt.steps.filter((_: Step, i: number) => i !== index);
    this.hunt = { ...this.hunt, steps };
    this.activeStep = Math.min(this.activeStep, steps.length - 1);
    if (this.pickModeStepIndex === index) this.pickModeStepIndex = null;
  }

  moveStep(index: number, dir: -1 | 1): void {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= this.hunt.steps.length) return;
    const steps = [...this.hunt.steps];
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    this.hunt = { ...this.hunt, steps };
    this.goToStep(newIndex);
  }

  // ── Map pick mode ─────────────────────────────────────────────────

  startPickMode(index: number): void {
    this.pickModeStepIndex = index;
    this.activeStep = index;
  }

  cancelPickMode(): void {
    this.pickModeStepIndex = null;
  }

  async onMapClick(coords: { lat: number; lng: number }): Promise<void> {
    if (this.pickModeStepIndex === null) return;
    const index = this.pickModeStepIndex;
    this.pickModeStepIndex = null;

    // Move the marker immediately — don't wait for geocoding
    const steps = [...this.hunt.steps];
    steps[index] = { ...steps[index], lat: coords.lat, lng: coords.lng };
    this.hunt = { ...this.hunt, steps };

    // Fill address once reverse geocoding resolves
    const address = await this.reverseGeocode(coords.lat, coords.lng);
    const updatedSteps = [...this.hunt.steps];
    updatedSteps[index] = { ...updatedSteps[index], address };
    this.hunt = { ...this.hunt, steps: updatedSteps };
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${environment.mapboxToken}&language=fr&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  // ── Hunt lifecycle ────────────────────────────────────────────────

  saveDraft(): void {
    this.huntService.saveDraft(this.hunt);
    this.refreshHunts();
  }

  publish(): void {
    const published = this.huntService.publishHunt(this.hunt);
    this.publishedCode = published.accessCode;
    this.showPublishModal = true;
    this.refreshHunts();
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.publishedCode);
    this.codeCopied = true;
    setTimeout(() => { this.codeCopied = false; }, 2000);
  }

  editHunt(hunt: Hunt): void {
    this.hunt = { ...hunt };
    this.activeStep = 0;
    this.pickModeStepIndex = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteHunt(id: string): void {
    if (confirm('Supprimer cette chasse ?')) {
      this.storage.deleteHunt(id);
      this.refreshHunts();
    }
  }
}
