import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Step, StepMedia, Enigma } from '../../../types';
import { environment } from '../../../environments/environment';
import { EnigmaBlockComponent } from '../enigma-block/enigma-block.component';

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

@Component({
  selector: 'app-step-card',
  standalone: true,
  imports: [FormsModule, EnigmaBlockComponent],
  template: `
    <div class="step-card" [class.is-active]="isActive">

      <!-- ── Nav : étape précédente ── -->
      @if (index > 0) {
        <button class="nav-strip nav-top"
          (click)="prevStep.emit(); $event.stopPropagation()">
          <span class="chev chev-up"></span>
          <span class="nav-label">Étape {{ index }}</span>
        </button>
      }

      <div class="card-body">

        <!-- ── Header ── -->
        <div class="card-header">
          <div class="step-badge">{{ index + 1 }}</div>
          <div class="move-btns">
            <button class="ctrl-btn" title="Monter" [disabled]="index === 0"
              (click)="moveUp.emit(); $event.stopPropagation()">↑</button>
            <button class="ctrl-btn" title="Descendre" [disabled]="index === total - 1"
              (click)="moveDown.emit(); $event.stopPropagation()">↓</button>
          </div>
          @if (total > 1) {
            <button class="ctrl-btn ctrl-danger" title="Supprimer cette étape"
              (click)="delete.emit(); $event.stopPropagation()">✕</button>
          }
        </div>

        <!-- ── Titre ── -->
        <div class="field">
          <label class="lbl">Titre de l'étape</label>
          <input class="fi" type="text"
            [ngModel]="step.title"
            (ngModelChange)="patch({title: $event})"
            placeholder="Ex : Tour Eiffel" />
        </div>

        <!-- ── Adresse + autocomplétion ── -->
        <div class="field">
          <label class="lbl">📍 Adresse</label>
          <div class="ac-wrap">
            <input class="fi" type="text"
              [ngModel]="step.address"
              (ngModelChange)="onAddressInput($event)"
              (focus)="onAddressFocus()"
              (blur)="scheduleClose()"
              placeholder="Rechercher une adresse…"
              autocomplete="off" />
            @if (searching) { <span class="ac-spin">⟳</span> }
            @if (showDropdown && suggestions.length > 0) {
              <ul class="ac-list">
                @for (s of suggestions; track s.id) {
                  <li class="ac-item" (mousedown)="pickSuggestion(s)">
                    <span class="ac-pin">📍</span>
                    <span>{{ s.place_name }}</span>
                  </li>
                }
              </ul>
            }
          </div>
          @if (step.lat !== 0 || step.lng !== 0) {
            <span class="coord-chip">{{ step.lat.toFixed(5) }}, {{ step.lng.toFixed(5) }}</span>
          }
          <button class="btn-pick-map" (click)="requestPickMode.emit(); $event.stopPropagation()">
            🗺️ Placer sur la carte
          </button>
        </div>

        <!-- ── Médias (indices visuels pour le joueur) ── -->
        <div class="field">
          <label class="lbl">🖼️ Médias de l'étape</label>
          <div class="drop-zone"
            [class.drag-over]="dragging"
            (dragover)="onDragOver($event)"
            (dragleave)="dragging = false"
            (drop)="onDrop($event)"
            (click)="fileRef.click()">
            <span class="drop-icon">📎</span>
            <strong class="drop-label">Glissez ou cliquez pour ajouter</strong>
            <small class="drop-types">Photos · Vidéos · Fichiers</small>
          </div>
          <input #fileRef type="file" multiple (change)="onFilePick($event)" style="display:none" />
          @if (step.media.length > 0) {
            <div class="media-row">
              @for (m of step.media; track m.id) {
                <div class="media-chip">
                  @if (m.type === 'image') {
                    <img class="media-thumb" [src]="m.url" [alt]="m.name" />
                  } @else {
                    <div class="media-icon-box">{{ m.type === 'video' ? '🎬' : '📄' }}</div>
                  }
                  <span class="media-name" [title]="m.name">
                    {{ m.name.length > 12 ? m.name.slice(0, 10) + '…' : m.name }}
                  </span>
                  <span class="media-size">{{ fmtSize(m.size) }}</span>
                  <button class="media-rm" (click)="rmMedia(m.id); $event.stopPropagation()">✕</button>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── Énigmes ── -->
        <div class="field enigmas-field">
          <label class="lbl">🧩 Énigmes &amp; Réponses</label>
          <div class="enigmas-list">
            @for (enigma of step.enigmas; track enigma.id; let i = $index) {
              <app-enigma-block
                [enigma]="enigma"
                [index]="i"
                [total]="step.enigmas.length"
                (enigmaChange)="updateEnigma(i, $event)"
                (delete)="removeEnigma(i)"
                (moveUp)="moveEnigma(i, -1)"
                (moveDown)="moveEnigma(i, 1)"
              ></app-enigma-block>
            }
          </div>
          <button class="btn-add-enigma" (click)="addEnigma(); $event.stopPropagation()">
            + Ajouter une énigme
          </button>
        </div>

      </div><!-- /.card-body -->

      <!-- ── Nav : étape suivante ── -->
      @if (index < total - 1) {
        <button class="nav-strip nav-bottom"
          (click)="nextStep.emit(); $event.stopPropagation()">
          <span class="nav-label">Étape {{ index + 2 }}</span>
          <span class="chev chev-down"></span>
        </button>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Card ── */
    .step-card {
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
      animation: slideIn 0.22s ease-out;
      scroll-margin-top: 20px;
    }
    .card-body { padding: 20px; }
    .step-card.is-active {
      border-color: var(--color-coral);
      box-shadow: 6px 6px 0 var(--color-coral);
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Nav strips ── */
    .nav-strip {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 11px 20px; border: none; cursor: pointer;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px;
      color: var(--color-ink); background: rgba(45,45,45,0.04);
      transition: background 0.14s; letter-spacing: 0.2px;
    }
    .nav-strip:hover { background: var(--color-lemon); }
    .nav-top  { border-bottom: 2px solid rgba(45,45,45,0.1); }
    .nav-bottom { border-top: 2px solid rgba(45,45,45,0.1); }
    .nav-label { line-height: 1; }
    .chev {
      display: inline-block; width: 8px; height: 8px;
      border-top: 2.5px solid currentColor; border-right: 2.5px solid currentColor;
      border-radius: 1px; flex-shrink: 0;
    }
    .chev-up   { transform: rotate(-45deg) translateY(2px); }
    .chev-down { transform: rotate(135deg) translateY(-2px); }

    /* ── Header ── */
    .card-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 18px; padding-bottom: 14px;
      border-bottom: 2px solid rgba(45,45,45,0.1);
    }
    .step-badge {
      width: 38px; height: 38px;
      background: var(--color-coral); border: 2px solid var(--color-ink);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 17px; color: #fff; flex-shrink: 0;
    }
    .move-btns { display: flex; gap: 5px; }
    .ctrl-btn {
      width: 34px; height: 34px; border: 2px solid var(--color-ink);
      border-radius: 10px; background: var(--color-cream); font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s, transform 0.1s; flex-shrink: 0;
    }
    .ctrl-btn:hover:not(:disabled) { background: var(--color-lemon); transform: translateY(-1px); }
    .ctrl-btn:disabled { opacity: 0.28; cursor: not-allowed; }
    .ctrl-btn.ctrl-danger { border-color: #e03; margin-left: auto; }
    .ctrl-btn.ctrl-danger:hover { background: #e03; color: #fff; }

    /* ── Fields ── */
    .field {
      display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px;
    }
    .field:last-child { margin-bottom: 0; }
    .lbl {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--color-ink); opacity: 0.55;
    }
    .fi {
      font-family: 'Nunito', sans-serif; font-size: 15px;
      padding: 10px 14px; border: 2px solid var(--color-ink); border-radius: 12px;
      background: var(--color-cream); color: var(--color-ink);
      outline: none; resize: vertical; width: 100%; box-sizing: border-box;
      transition: border-color 0.14s, box-shadow 0.14s;
    }
    .fi:focus { border-color: var(--color-sky); box-shadow: 3px 3px 0 var(--color-sky); }

    /* ── Address autocomplete ── */
    .ac-wrap { position: relative; }
    .ac-spin {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      font-size: 16px; opacity: 0.6; animation: spin 0.7s linear infinite; pointer-events: none;
    }
    @keyframes spin {
      from { transform: translateY(-50%) rotate(0deg); }
      to   { transform: translateY(-50%) rotate(360deg); }
    }
    .ac-list {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0;
      background: var(--color-paper); border: 2px solid var(--color-ink);
      border-radius: 12px; box-shadow: 4px 4px 0 var(--color-ink);
      list-style: none; z-index: 200; overflow: hidden;
      max-height: 230px; overflow-y: auto;
    }
    .ac-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; cursor: pointer;
      font-family: 'Nunito', sans-serif; font-size: 13px; line-height: 1.4;
      border-bottom: 1px solid rgba(45,45,45,0.07); transition: background 0.1s;
    }
    .ac-item:last-child { border-bottom: none; }
    .ac-item:hover { background: var(--color-lemon); }
    .ac-pin { flex-shrink: 0; font-size: 12px; margin-top: 1px; }
    .coord-chip {
      font-family: 'JetBrains Mono', monospace; font-size: 11px;
      background: rgba(45,45,45,0.06); border: 1px solid rgba(45,45,45,0.18);
      border-radius: 6px; padding: 3px 8px; color: var(--color-ink);
      opacity: 0.65; display: inline-block; width: fit-content;
    }
    .btn-pick-map {
      background: none; border: 2px dashed rgba(45,45,45,0.3);
      border-radius: 10px; padding: 7px 12px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      cursor: pointer; color: var(--color-ink); opacity: 0.65; transition: all 0.12s; text-align: left;
    }
    .btn-pick-map:hover { border-color: var(--color-sky); color: var(--color-sky); opacity: 1; background: rgba(78,205,196,0.06); }

    /* ── Drop zone ── */
    .drop-zone {
      border: 2px dashed rgba(45,45,45,0.28); border-radius: 14px;
      padding: 18px 16px; display: flex; flex-direction: column;
      align-items: center; gap: 4px; cursor: pointer; transition: all 0.14s; text-align: center;
    }
    .drop-zone:hover, .drop-zone.drag-over { border-color: var(--color-sky); background: rgba(78,205,196,0.07); }
    .drop-icon { font-size: 22px; }
    .drop-label { font-family: 'Nunito', sans-serif; font-size: 14px; color: var(--color-ink); }
    .drop-types { font-family: 'Nunito', sans-serif; font-size: 11px; color: var(--color-ink); opacity: 0.45; }

    /* ── Media chips ── */
    .media-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .media-chip { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 72px; }
    .media-thumb { width: 72px; height: 72px; object-fit: cover; border: 2px solid var(--color-ink); border-radius: 10px; }
    .media-icon-box {
      width: 72px; height: 72px; background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 26px;
    }
    .media-name {
      font-family: 'Nunito', sans-serif; font-size: 10px; color: var(--color-ink);
      opacity: 0.7; text-align: center; max-width: 72px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .media-size { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--color-ink); opacity: 0.4; }
    .media-rm {
      position: absolute; top: -6px; right: -6px; width: 20px; height: 20px;
      background: #e03; color: #fff; border: 2px solid var(--color-ink);
      border-radius: 50%; font-size: 11px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;
    }

    /* ── Enigmas list ── */
    .enigmas-field { gap: 10px; }
    .enigmas-list { display: flex; flex-direction: column; gap: 10px; }
    .btn-add-enigma {
      width: 100%; background: none;
      border: 2px dashed rgba(78,205,196,0.5); border-radius: 12px;
      padding: 10px 16px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      cursor: pointer; color: var(--color-sky); text-align: center; transition: all 0.12s;
    }
    .btn-add-enigma:hover { background: rgba(78,205,196,0.08); border-color: var(--color-sky); }
  `],
})
export class StepCardComponent implements OnDestroy {
  @Input() step!: Step;
  @Input() index!: number;
  @Input() total!: number;
  @Input() isActive = false;

  @Output() stepChange = new EventEmitter<Step>();
  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() requestPickMode = new EventEmitter<void>();
  @Output() prevStep = new EventEmitter<void>();
  @Output() nextStep = new EventEmitter<void>();

  @ViewChild('fileRef') fileRef!: ElementRef<HTMLInputElement>;

  suggestions: MapboxFeature[] = [];
  showDropdown = false;
  searching = false;
  dragging = false;

  private searchTimer?: ReturnType<typeof setTimeout>;
  private lastQuery = '';

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  patch(partial: Partial<Step>): void {
    this.stepChange.emit({ ...this.step, ...partial });
  }

  // ── Enigma list ───────────────────────────────────────────────────

  updateEnigma(index: number, enigma: Enigma): void {
    const enigmas = [...this.step.enigmas];
    enigmas[index] = enigma;
    this.patch({ enigmas });
  }

  addEnigma(): void {
    const enigma: Enigma = {
      id: this.uid(),
      title: '',
      description: '',
      answer: { type: 'text', text: '', caseSensitive: false, options: [], mediaAccept: { photo: true, video: true } },
    };
    this.patch({ enigmas: [...this.step.enigmas, enigma] });
  }

  removeEnigma(index: number): void {
    if (this.step.enigmas.length <= 1) return;
    this.patch({ enigmas: this.step.enigmas.filter((_: Enigma, i: number) => i !== index) });
  }

  moveEnigma(index: number, dir: -1 | 1): void {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= this.step.enigmas.length) return;
    const enigmas = [...this.step.enigmas];
    [enigmas[index], enigmas[newIndex]] = [enigmas[newIndex], enigmas[index]];
    this.patch({ enigmas });
  }

  // ── Address autocomplete ──────────────────────────────────────────

  onAddressInput(value: string): void {
    this.patch({ address: value });
    this.showDropdown = false;
    clearTimeout(this.searchTimer);
    if (value.length < 3) { this.suggestions = []; this.searching = false; return; }
    this.lastQuery = value;
    this.searching = true;
    this.searchTimer = setTimeout(() => this.fetchSuggestions(value), 350);
  }

  onAddressFocus(): void {
    if (this.suggestions.length > 0) this.showDropdown = true;
  }

  scheduleClose(): void {
    setTimeout(() => { this.showDropdown = false; }, 200);
  }

  async fetchSuggestions(query: string): Promise<void> {
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?access_token=${environment.mapboxToken}&language=fr&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (query === this.lastQuery) {
        this.suggestions = data.features ?? [];
        this.showDropdown = this.suggestions.length > 0;
      }
    } catch {
      if (query === this.lastQuery) this.suggestions = [];
    } finally {
      if (query === this.lastQuery) this.searching = false;
    }
  }

  pickSuggestion(feature: MapboxFeature): void {
    this.patch({ address: feature.place_name, lng: feature.center[0], lat: feature.center[1] });
    this.suggestions = [];
    this.showDropdown = false;
    this.searching = false;
  }

  // ── File upload ───────────────────────────────────────────────────

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragging = true; }

  onDrop(e: DragEvent): void {
    e.preventDefault(); this.dragging = false;
    const files = e.dataTransfer?.files;
    if (files?.length) this.processFiles(Array.from(files));
  }

  onFilePick(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (files?.length) this.processFiles(Array.from(files));
    (event.target as HTMLInputElement).value = '';
  }

  private async processFiles(files: File[]): Promise<void> {
    const newMedia = await Promise.all(files.map(f => this.toMedia(f)));
    this.patch({ media: [...this.step.media, ...newMedia] });
  }

  private toMedia(file: File): Promise<StepMedia> {
    const type: StepMedia['type'] = file.type.startsWith('image/')
      ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    if (type === 'file') {
      return Promise.resolve({ id: this.uid(), type, name: file.name, url: '', size: file.size });
    }
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ id: this.uid(), type, name: file.name, url: e.target!.result as string, size: file.size });
      reader.readAsDataURL(file);
    });
  }

  rmMedia(id: string): void {
    this.patch({ media: this.step.media.filter(m => m.id !== id) });
  }

  fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private uid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
