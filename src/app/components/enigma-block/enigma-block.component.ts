import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Enigma, AnswerType, AnswerOption, StepAnswer, Hint } from '../../../types';
import { RichEditorComponent } from '../rich-editor/rich-editor.component';

@Component({
  selector: 'app-enigma-block',
  standalone: true,
  imports: [FormsModule, RichEditorComponent],
  template: `
    <div class="enigma-block">

      <!-- Header -->
      <div class="eb-header">
        <span class="eb-num">{{ index + 1 }}</span>
        <span class="eb-label">{{ total === 1 ? 'Énigme' : 'Énigme ' + (index + 1) }}</span>
        <label class="points-badge" title="Points attribués à cette énigme">
          <span class="pts-icon">⭐</span>
          <input class="pts-input" type="number" min="0" step="10"
            [ngModel]="enigma.points"
            (ngModelChange)="patch({points: $event < 0 ? 0 : +$event})"
            (click)="$event.stopPropagation()" />
          <span class="pts-label">pts</span>
        </label>
        <div class="eb-actions">
          <button class="eb-btn" title="Monter" [disabled]="index === 0"
            (click)="moveUp.emit(); $event.stopPropagation()">↑</button>
          <button class="eb-btn" title="Descendre" [disabled]="index === total - 1"
            (click)="moveDown.emit(); $event.stopPropagation()">↓</button>
          @if (total > 1) {
            <button class="eb-btn eb-btn-danger" title="Supprimer"
              (click)="delete.emit(); $event.stopPropagation()">✕</button>
          }
        </div>
      </div>

      <!-- Title (optional) -->
      <div class="field">
        <label class="lbl">Titre (optionnel)</label>
        <input class="fi" type="text"
          [ngModel]="enigma.title"
          (ngModelChange)="patch({title: $event})"
          placeholder="Ex : Indice visuel…" />
      </div>

      <!-- Description -->
      <div class="field">
        <label class="lbl">📝 Description</label>
        <app-rich-editor
          [value]="enigma.description"
          (valueChange)="patch({description: $event})"
          placeholder="Décrivez l'indice ou la question à résoudre…">
        </app-rich-editor>
      </div>

      <!-- Answer section -->
      <div class="field">
        <label class="lbl">🔑 Type de réponse</label>

        <!-- 4-tab segmented control -->
        <div class="answer-type-seg">
          <button class="seg-btn" [class.active]="enigma.answer.type === 'text'"
            (click)="setAnswerType('text'); $event.stopPropagation()">Texte</button>
          <button class="seg-btn" [class.active]="enigma.answer.type === 'checkbox'"
            (click)="setAnswerType('checkbox'); $event.stopPropagation()">Multiple</button>
          <button class="seg-btn" [class.active]="enigma.answer.type === 'radio'"
            (click)="setAnswerType('radio'); $event.stopPropagation()">Unique</button>
          <button class="seg-btn seg-btn-media" [class.active]="enigma.answer.type === 'media'"
            (click)="setAnswerType('media'); $event.stopPropagation()">Média</button>
        </div>

        <!-- Text type -->
        @if (enigma.answer.type === 'text') {
          <textarea class="fi" rows="2"
            [ngModel]="enigma.answer.text"
            (ngModelChange)="patchAnswer({text: $event})"
            placeholder="La bonne réponse…"></textarea>
          <label class="case-row">
            <input type="checkbox"
              [checked]="enigma.answer.caseSensitive"
              (change)="patchAnswer({caseSensitive: !enigma.answer.caseSensitive})" />
            <span>Sensible à la casse</span>
          </label>
        }

        <!-- Checkbox / Radio options -->
        @if (enigma.answer.type === 'checkbox' || enigma.answer.type === 'radio') {
          <div class="options-list">
            @for (opt of enigma.answer.options; track opt.id) {
              <div class="option-row">
                <input class="fi option-input" type="text"
                  [ngModel]="opt.label"
                  (ngModelChange)="updateOption(opt.id, $event)"
                  placeholder="Proposition…" />
                <label class="toggle" [title]="opt.isCorrect ? 'Bonne réponse' : 'Marquer comme bonne réponse'">
                  <input type="checkbox" [checked]="opt.isCorrect" (change)="toggleCorrect(opt.id)" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
                <button class="btn-rm-opt"
                  (click)="removeOption(opt.id); $event.stopPropagation()">✕</button>
              </div>
            }
          </div>
          <button class="btn-add-opt"
            (click)="addOption(); $event.stopPropagation()">+ Ajouter une proposition</button>
        }

        <!-- Media type config -->
        @if (enigma.answer.type === 'media') {
          <div class="media-config">
            <p class="media-hint">Le joueur devra soumettre un fichier pour valider cette énigme.</p>
            <div class="media-toggles">
              <div class="toggle-row">
                <span>📷 Accepter les photos</span>
                <label class="toggle">
                  <input type="checkbox"
                    [checked]="enigma.answer.mediaAccept.photo"
                    (change)="toggleMediaAccept('photo')" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
              </div>
              <div class="toggle-row">
                <span>🎥 Accepter les vidéos</span>
                <label class="toggle">
                  <input type="checkbox"
                    [checked]="enigma.answer.mediaAccept.video"
                    (change)="toggleMediaAccept('video')" />
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Hints section -->
      <div class="field">
        <label class="lbl">💡 Indices (optionnel)</label>
        @for (hint of (enigma.hints ?? []); track hint.id; let i = $index) {
          <div class="hint-row">
            <span class="hint-num">{{ i + 1 }}</span>
            <input class="fi hint-text" type="text"
              [ngModel]="hint.text"
              (ngModelChange)="updateHint(hint.id, { text: $event })"
              [placeholder]="'Indice ' + (i + 1)" />
            <div class="hint-threshold">
              <span class="hint-after">après</span>
              <input class="hint-count-input" type="number" min="1" step="1"
                [ngModel]="hint.unlockAfterAttempts"
                (ngModelChange)="updateHint(hint.id, { unlockAfterAttempts: $event < 1 ? 1 : +$event })" />
              <span class="hint-after">erreurs</span>
            </div>
            <button class="btn-rm-opt" title="Supprimer cet indice"
              (click)="removeHint(hint.id); $event.stopPropagation()">✕</button>
          </div>
        }
        <button class="btn-add-opt" (click)="addHint(); $event.stopPropagation()">
          + Ajouter un indice
        </button>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .enigma-block {
      background: rgba(45,45,45,0.025);
      border: 2px solid rgba(45,45,45,0.1);
      border-left: 4px solid var(--color-sky);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Header */
    .eb-header { display: flex; align-items: center; gap: 8px; }
    .eb-num {
      width: 26px; height: 26px;
      background: var(--color-sky);
      border: 2px solid var(--color-ink);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive;
      font-size: 12px; color: #fff; flex-shrink: 0;
    }
    .eb-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 800; font-size: 13px;
      color: var(--color-ink); opacity: 0.6; flex: 1;
    }
    /* Points badge */
    .points-badge {
      display: flex; align-items: center; gap: 3px;
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 20px; padding: 2px 8px 2px 6px;
      flex-shrink: 0; cursor: text; transition: box-shadow 0.12s;
    }
    .points-badge:focus-within { box-shadow: 2px 2px 0 var(--color-ink); }
    .pts-icon { font-size: 12px; line-height: 1; }
    .pts-input {
      width: 40px; border: none; background: transparent;
      font-family: 'Fredoka One', cursive; font-size: 14px;
      color: var(--color-ink); text-align: center; outline: none; padding: 0;
      -moz-appearance: textfield;
    }
    .pts-input::-webkit-outer-spin-button,
    .pts-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .pts-label {
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 10px;
      color: var(--color-ink); opacity: 0.65; text-transform: uppercase;
    }

    .eb-actions { display: flex; gap: 4px; }
    .eb-btn {
      width: 28px; height: 28px;
      border: 2px solid var(--color-ink); border-radius: 8px;
      background: var(--color-paper); font-size: 12px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s;
    }
    .eb-btn:hover:not(:disabled) { background: var(--color-lemon); }
    .eb-btn:disabled { opacity: 0.25; cursor: not-allowed; }
    .eb-btn-danger { border-color: #e03; }
    .eb-btn-danger:hover:not(:disabled) { background: #e03 !important; color: #fff; }

    /* Fields */
    .field { display: flex; flex-direction: column; gap: 6px; }
    .lbl {
      font-family: 'Nunito', sans-serif;
      font-weight: 700; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--color-ink); opacity: 0.5;
    }
    .fi {
      font-family: 'Nunito', sans-serif; font-size: 14px;
      padding: 9px 12px;
      border: 2px solid var(--color-ink); border-radius: 10px;
      background: var(--color-paper); color: var(--color-ink);
      outline: none; resize: vertical; width: 100%; box-sizing: border-box;
      transition: border-color 0.14s;
    }
    .fi:focus { border-color: var(--color-sky); box-shadow: 2px 2px 0 var(--color-sky); }

    /* Segmented control */
    .answer-type-seg {
      display: flex; border: 2px solid var(--color-ink);
      border-radius: 10px; overflow: hidden;
    }
    .seg-btn {
      flex: 1; padding: 7px 4px; border: none;
      border-right: 2px solid var(--color-ink);
      background: var(--color-paper);
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 11px;
      cursor: pointer; color: var(--color-ink); opacity: 0.5; transition: all 0.12s;
    }
    .seg-btn:last-child { border-right: none; }
    .seg-btn.active { background: var(--color-coral); color: #fff; opacity: 1; }
    .seg-btn-media.active { background: var(--color-sky); }
    .seg-btn:hover:not(.active) { background: var(--color-lemon); opacity: 1; }

    /* Case-sensitivity */
    .case-row {
      display: flex; align-items: center; gap: 8px;
      font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 600;
      cursor: pointer; color: var(--color-ink); opacity: 0.65;
    }

    /* Options */
    .options-list { display: flex; flex-direction: column; gap: 6px; }
    .option-row { display: flex; align-items: center; gap: 6px; }
    .option-input { flex: 1; padding: 8px 10px; font-size: 13px; }

    /* iOS toggle */
    .toggle {
      position: relative; display: inline-flex; align-items: center;
      width: 40px; height: 22px; flex-shrink: 0; cursor: pointer;
    }
    .toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
    .toggle-track {
      display: block; width: 40px; height: 22px;
      background: rgba(45,45,45,0.12);
      border: 2px solid var(--color-ink); border-radius: 11px;
      position: relative; transition: background 0.18s;
    }
    .toggle input:checked + .toggle-track { background: var(--color-mint); }
    .toggle-thumb {
      position: absolute; top: 2px; left: 2px;
      width: 14px; height: 14px;
      background: #fff; border: 2px solid var(--color-ink);
      border-radius: 50%; transition: transform 0.18s;
    }
    .toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(18px); }

    .btn-rm-opt {
      width: 26px; height: 26px; flex-shrink: 0;
      background: none; border: 2px solid #e03; border-radius: 7px;
      color: #e03; font-size: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.12s;
    }
    .btn-rm-opt:hover { background: #e03; color: #fff; }

    .btn-add-opt {
      background: none; border: 2px dashed rgba(45,45,45,0.22); border-radius: 8px;
      padding: 7px 12px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px;
      cursor: pointer; color: var(--color-ink); opacity: 0.6; text-align: left; transition: all 0.12s;
    }
    .btn-add-opt:hover { border-color: var(--color-mint); color: var(--color-mint); opacity: 1; }

    /* Hints */
    .hint-row {
      display: flex; align-items: center; gap: 6px; flex-wrap: nowrap;
    }
    .hint-num {
      width: 22px; height: 22px; flex-shrink: 0;
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 11px; color: var(--color-ink);
    }
    .hint-text { flex: 1; min-width: 0; padding: 8px 10px; font-size: 13px; }
    .hint-threshold {
      display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    }
    .hint-after {
      font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 700;
      color: var(--color-ink); opacity: 0.6; white-space: nowrap;
    }
    .hint-count-input {
      width: 46px; padding: 6px 4px; text-align: center;
      font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700;
      border: 2px solid var(--color-ink); border-radius: 8px;
      background: var(--color-paper); outline: none;
      -moz-appearance: textfield;
    }
    .hint-count-input::-webkit-outer-spin-button,
    .hint-count-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .hint-count-input:focus { border-color: var(--color-sky); }

    /* Media config */
    .media-config {
      background: rgba(78,205,196,0.06);
      border: 2px dashed rgba(78,205,196,0.4);
      border-radius: 10px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .media-hint {
      font-family: 'Nunito', sans-serif; font-size: 12px;
      color: var(--color-ink); opacity: 0.6; margin: 0;
    }
    .media-toggles { display: flex; flex-direction: column; gap: 8px; }
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700;
      color: var(--color-ink);
    }
  `],
})
export class EnigmaBlockComponent {
  @Input() enigma!: Enigma;
  @Input() index!: number;
  @Input() total!: number;

  @Output() enigmaChange = new EventEmitter<Enigma>();
  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  patch(partial: Partial<Enigma>): void {
    this.enigmaChange.emit({ ...this.enigma, ...partial });
  }

  patchAnswer(partial: Partial<StepAnswer>): void {
    this.patch({ answer: { ...this.enigma.answer, ...partial } });
  }

  setAnswerType(type: AnswerType): void {
    if (type === 'radio') {
      let found = false;
      const options = this.enigma.answer.options.map(o => {
        if (o.isCorrect && !found) { found = true; return o; }
        return o.isCorrect ? { ...o, isCorrect: false } : o;
      });
      this.patchAnswer({ type, options });
    } else {
      this.patchAnswer({ type });
    }
  }

  addOption(): void {
    const opt: AnswerOption = { id: this.uid(), label: '', isCorrect: false };
    this.patchAnswer({ options: [...this.enigma.answer.options, opt] });
  }

  removeOption(id: string): void {
    this.patchAnswer({ options: this.enigma.answer.options.filter(o => o.id !== id) });
  }

  updateOption(id: string, label: string): void {
    this.patchAnswer({
      options: this.enigma.answer.options.map(o => o.id === id ? { ...o, label } : o),
    });
  }

  toggleCorrect(id: string): void {
    const options = this.enigma.answer.type === 'radio'
      ? this.enigma.answer.options.map(o => ({ ...o, isCorrect: o.id === id }))
      : this.enigma.answer.options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o);
    this.patchAnswer({ options });
  }

  toggleMediaAccept(field: 'photo' | 'video'): void {
    this.patchAnswer({
      mediaAccept: { ...this.enigma.answer.mediaAccept, [field]: !this.enigma.answer.mediaAccept[field] },
    });
  }

  addHint(): void {
    const hint: Hint = { id: this.uid(), text: '', unlockAfterAttempts: 3 };
    this.patch({ hints: [...(this.enigma.hints ?? []), hint] });
  }

  removeHint(id: string): void {
    this.patch({ hints: (this.enigma.hints ?? []).filter(h => h.id !== id) });
  }

  updateHint(id: string, partial: Partial<Hint>): void {
    this.patch({
      hints: (this.enigma.hints ?? []).map(h => h.id === id ? { ...h, ...partial } : h),
    });
  }

  private uid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
