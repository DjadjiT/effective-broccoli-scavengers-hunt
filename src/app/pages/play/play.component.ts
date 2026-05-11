import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { StorageService } from '../../services/storage.service';
import { HuntService } from '../../services/hunt.service';
import { Hunt, PlayerProgress, Step } from '../../../types';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';
import { MapComponent } from '../../components/map/map.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LanguageToggleComponent,
    MapComponent,
    ModalComponent,
    ProgressBarComponent,
  ],
  template: `
    <div class="play-page">
      <div class="map-full">
        @if (hunt) {
          <app-map
            #mapRef
            [steps]="hunt.steps"
            [activeStepIndex]="progress?.currentStepIndex ?? 0"
            [completedStepIds]="progress?.completedStepIds ?? []"
            (markerClick)="onMarkerClick($event)"
          ></app-map>
        }

        <header class="play-header">
          <a routerLink="/" class="back-pill">← Accueil</a>
          <span class="hunt-title-pill">{{ hunt?.name }}</span>
          <app-language-toggle></app-language-toggle>
        </header>
      </div>

      <!-- Bottom sheet -->
      @if (hunt && progress) {
        <div class="bottom-sheet" [class.expanded]="sheetExpanded">
          <div class="sheet-handle" (click)="sheetExpanded = !sheetExpanded"></div>

          <div class="sheet-content">
            <app-progress-bar
              [current]="progress.currentStepIndex + 1"
              [total]="hunt.steps.length"
            ></app-progress-bar>

            @if (isCompleted) {
              <div class="step-info">
                <p class="step-done">🎉 Toutes les étapes complétées !</p>
              </div>
            } @else {
              @let step = hunt.steps[progress.currentStepIndex];
              @let enigma = step?.enigmas?.[currentEnigmaIndex];
              <div class="step-info">
                <div class="step-header">
                  <span class="step-badge">{{ progress.currentStepIndex + 1 }}</span>
                  <h3 class="step-title">{{ step?.title }}</h3>
                </div>

                <!-- Enigma progress dots (multi-enigma steps) -->
                @if ((step?.enigmas?.length ?? 0) > 1) {
                  <div class="enigma-progress">
                    @for (e of step!.enigmas; track e.id; let i = $index) {
                      <span class="enigma-dot"
                        [class.active]="i === currentEnigmaIndex"
                        [class.done]="i < currentEnigmaIndex">{{ i + 1 }}</span>
                    }
                  </div>
                }

                <!-- Enigma title -->
                @if (enigma?.title) {
                  <h4 class="enigma-title">{{ enigma!.title }}</h4>
                }

                <!-- Enigma description -->
                <p class="enigma-text">{{ enigma?.description }}</p>

                <!-- Answer UI -->
                <div [class.shake-answer]="shakeAnswer">

                  <!-- Text type -->
                  @if (enigma?.answer?.type === 'text') {
                    <div class="answer-row" [class.wrong]="wrongAnswer">
                      <input type="text" class="answer-input"
                        [(ngModel)]="answerInput"
                        [placeholder]="i18n.t('answer') + '...'"
                        (keydown.enter)="submitAnswer()"
                        [disabled]="isCompleted" />
                      <button class="btn-validate" (click)="submitAnswer()" [disabled]="isCompleted">
                        {{ i18n.t('validate') }}
                      </button>
                    </div>
                  }

                  <!-- Checkbox / Radio type -->
                  @if (enigma?.answer?.type === 'checkbox' || enigma?.answer?.type === 'radio') {
                    <div class="options-play" [class.wrong]="wrongAnswer">
                      @for (opt of enigma!.answer.options; track opt.id) {
                        <label class="option-play-row" [class.selected]="isSelected(opt.id)">
                          <input
                            [type]="enigma!.answer.type === 'radio' ? 'radio' : 'checkbox'"
                            [name]="'ans-' + enigma!.id"
                            [checked]="isSelected(opt.id)"
                            (change)="toggleSelectOption(opt.id, enigma!.answer.type)"
                            [disabled]="isCompleted" />
                          <span class="option-play-label">{{ opt.label }}</span>
                        </label>
                      }
                    </div>
                    <button class="btn-validate btn-validate-full" (click)="submitAnswer()" [disabled]="isCompleted">
                      {{ i18n.t('validate') }}
                    </button>
                  }

                  <!-- Media type -->
                  @if (enigma?.answer?.type === 'media') {
                    <div class="media-answer-section">

                      <!-- Hidden capture inputs -->
                      <input #photoCapture type="file" accept="image/*"
                        [attr.capture]="'environment'" style="display:none"
                        (change)="onMediaSelected($event)" />
                      <input #videoCapture type="file" accept="video/*"
                        [attr.capture]="'environment'" style="display:none"
                        (change)="onMediaSelected($event)" />
                      <input #galleryPicker type="file" accept="image/*,video/*"
                        style="display:none"
                        (change)="onMediaSelected($event)" />

                      @if (!mediaAnswer) {
                        <div class="media-upload-btns">
                          @if (enigma!.answer.mediaAccept.photo) {
                            <button class="btn-media"
                              (click)="photoCaptureRef?.nativeElement?.click(); $event.stopPropagation()">
                              📷 Prendre une photo
                            </button>
                          }
                          @if (enigma!.answer.mediaAccept.video) {
                            <button class="btn-media"
                              (click)="videoCaptureRef?.nativeElement?.click(); $event.stopPropagation()">
                              🎥 Filmer
                            </button>
                          }
                          <button class="btn-media btn-media-gallery"
                            (click)="galleryPickerRef?.nativeElement?.click(); $event.stopPropagation()">
                            🖼️ Depuis la galerie
                          </button>
                        </div>
                      } @else {
                        <div class="media-selected">
                          @if (mediaAnswer.type.startsWith('image/')) {
                            <img class="media-preview-img" [src]="mediaPreviewUrl" alt="Aperçu" />
                          } @else if (mediaAnswer.type.startsWith('video/')) {
                            <video class="media-preview-video" [src]="mediaPreviewUrl" controls></video>
                          } @else {
                            <div class="media-preview-file">📄 {{ mediaAnswer.name }}</div>
                          }
                          <button class="btn-media-rm"
                            (click)="clearMedia(); $event.stopPropagation()">✕ Changer</button>
                        </div>
                      }

                      <button class="btn-validate btn-validate-full"
                        (click)="submitAnswer()"
                        [disabled]="!mediaAnswer || isCompleted">
                        {{ i18n.t('validate') }}
                      </button>
                    </div>
                  }

                </div>

                @if (wrongAnswer) {
                  <p class="wrong-msg">❌ {{ i18n.t('wrongAnswer') }}</p>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Rules modal -->
    <app-modal [visible]="showRules" [closeOnBackdrop]="false" (close)="dismissRules()">
      <div class="rules-modal">
        <div class="rules-icon">🗺️</div>
        <h2>{{ i18n.t('rulesTitle') }}</h2>
        <ul class="rules-list">
          <li>{{ i18n.t('rules1') }}</li>
          <li>{{ i18n.t('rules2') }}</li>
          <li>{{ i18n.t('rules3') }}</li>
        </ul>
        <button class="btn-cta" (click)="dismissRules()">{{ i18n.t('rulesGotIt') }}</button>
      </div>
    </app-modal>

    <!-- Confetti -->
    @if (showConfetti) {
      <div class="confetti-container">
        @for (i of confettiItems; track i) {
          <div class="confetti-piece" [style]="confettiStyle(i)"></div>
        }
      </div>
    }

    <!-- Victory modal -->
    <app-modal [visible]="showVictory" [closeOnBackdrop]="false">
      <div class="victory-modal">
        <div class="trophy">🏆</div>
        <h2>{{ i18n.t('congratulations') }}</h2>
        <h3>{{ hunt?.name }}</h3>
        @if (completionTime) {
          <p class="stat">⏱ {{ i18n.t('completionTime') }} : <strong>{{ completionTime }}</strong></p>
        }
        <p class="stat">💡 {{ i18n.t('hintsUsed') }} : <strong>{{ progress?.hintsUsed ?? 0 }}</strong></p>
        <a routerLink="/" class="btn-cta block">{{ i18n.t('playAnother') }}</a>
      </div>
    </app-modal>
  `,
  styles: [`
    .play-page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: var(--color-ink); }
    .map-full { flex: 1; position: relative; overflow: hidden; }
    app-map { display: block; height: 100%; }
    .play-header {
      position: absolute; top: 0; left: 0; right: 0;
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; z-index: 500; pointer-events: none;
    }
    .play-header > * { pointer-events: all; }
    .back-pill, .hunt-title-pill {
      background: var(--color-paper); border: 2px solid var(--color-ink);
      border-radius: 20px; padding: 6px 14px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      color: var(--color-ink); text-decoration: none; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .hunt-title-pill {
      font-family: 'Fredoka One', cursive; font-size: 15px;
      max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .bottom-sheet {
      background: var(--color-paper); border-top: 3px solid var(--color-ink);
      border-radius: 24px 24px 0 0; height: 42vh;
      transition: height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden; box-shadow: 0 -6px 0 var(--color-ink);
      display: flex; flex-direction: column;
    }
    .bottom-sheet.expanded { height: 75vh; }
    .sheet-handle {
      width: 40px; height: 4px; background: rgba(45,45,45,0.3);
      border-radius: 2px; margin: 12px auto; cursor: pointer; flex-shrink: 0;
    }
    .sheet-content {
      padding: 0 20px 20px; overflow-y: auto; flex: 1;
      display: flex; flex-direction: column; gap: 16px;
    }
    .step-info { display: flex; flex-direction: column; gap: 12px; }
    .step-header { display: flex; align-items: center; gap: 12px; }
    .step-badge {
      width: 36px; height: 36px; background: var(--color-coral);
      border: 2px solid var(--color-ink); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 18px; color: #fff; flex-shrink: 0;
    }
    .step-title { font-family: 'Fredoka One', cursive; font-size: 22px; margin: 0; color: var(--color-ink); }

    /* Enigma progress dots */
    .enigma-progress { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .enigma-dot {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--color-ink); background: var(--color-cream);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 11px;
      color: var(--color-ink); opacity: 0.4; transition: all 0.2s;
    }
    .enigma-dot.active { background: var(--color-coral); color: #fff; opacity: 1; }
    .enigma-dot.done { background: var(--color-mint); color: #fff; opacity: 1; }

    .enigma-title {
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 14px;
      color: var(--color-sky); margin: 0; letter-spacing: 0.2px;
    }
    .enigma-text {
      font-family: 'Nunito', sans-serif; font-size: 15px; line-height: 1.6;
      color: var(--color-ink); margin: 0;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 14px 16px;
    }
    .answer-row { display: flex; gap: 8px; }
    .answer-row.wrong .answer-input { border-color: var(--color-coral); box-shadow: 3px 3px 0 var(--color-coral); }
    .shake-answer { animation: shake 0.4s ease; }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    .answer-input {
      flex: 1; font-family: 'Nunito', sans-serif; font-size: 16px;
      padding: 12px 16px; border: 2px solid var(--color-ink); border-radius: 14px;
      background: var(--color-cream); outline: none;
    }
    .answer-input:focus { border-color: var(--color-sky); box-shadow: 3px 3px 0 var(--color-sky); }
    .btn-validate {
      padding: 12px 20px; background: var(--color-mint); color: #fff;
      border: 2px solid var(--color-ink); border-radius: 14px;
      font-family: 'Fredoka One', cursive; font-size: 16px; cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s; white-space: nowrap;
    }
    .btn-validate:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-validate:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--color-ink); }
    .btn-validate:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: 3px 3px 0 var(--color-ink); }
    .btn-validate-full { width: 100%; margin-top: 4px; }

    /* Options play */
    .options-play { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
    .options-play.wrong .option-play-row { border-color: var(--color-coral); }
    .option-play-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 14px; cursor: pointer;
      font-family: 'Nunito', sans-serif; font-size: 15px;
      transition: background 0.12s, border-color 0.12s;
    }
    .option-play-row input { accent-color: var(--color-coral); width: 18px; height: 18px; flex-shrink: 0; cursor: pointer; }
    .option-play-row.selected { background: rgba(255,107,107,0.1); border-color: var(--color-coral); }
    .option-play-label { flex: 1; line-height: 1.4; }

    /* Media answer */
    .media-answer-section { display: flex; flex-direction: column; gap: 10px; }
    .media-upload-btns { display: flex; flex-direction: column; gap: 8px; }
    .btn-media {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 14px 20px; background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 14px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 15px;
      cursor: pointer; box-shadow: 3px 3px 0 var(--color-ink); transition: transform 0.1s;
    }
    .btn-media:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-media-gallery { background: var(--color-sky); color: #fff; }
    .media-selected { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .media-preview-img {
      width: 100%; max-height: 220px; object-fit: cover;
      border-radius: 12px; border: 2px solid var(--color-ink);
    }
    .media-preview-video { width: 100%; border-radius: 12px; border: 2px solid var(--color-ink); }
    .media-preview-file {
      padding: 16px; background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 12px;
      font-family: 'Nunito', sans-serif; font-size: 14px; width: 100%; text-align: center; box-sizing: border-box;
    }
    .btn-media-rm {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      background: none; border: 2px solid rgba(45,45,45,0.3); border-radius: 10px;
      padding: 6px 12px; cursor: pointer; color: var(--color-ink); opacity: 0.65; transition: all 0.12s;
    }
    .btn-media-rm:hover { border-color: var(--color-coral); color: var(--color-coral); opacity: 1; }

    .wrong-msg { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px; color: var(--color-coral); margin: 0; }
    .step-done { font-family: 'Fredoka One', cursive; font-size: 22px; text-align: center; padding: 20px; }

    /* Rules modal */
    .rules-modal { text-align: center; }
    .rules-icon { font-size: 56px; margin-bottom: 8px; }
    .rules-modal h2 { font-family: 'Fredoka One', cursive; font-size: 28px; margin: 0 0 16px; }
    .rules-list { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 10px; text-align: left; }
    .rules-list li { font-family: 'Nunito', sans-serif; font-size: 15px; padding: 10px 14px; background: var(--color-cream); border: 2px solid var(--color-ink); border-radius: 12px; }
    .rules-list li::before { content: '→ '; color: var(--color-coral); font-weight: 900; }
    .btn-cta {
      display: block; font-family: 'Fredoka One', cursive; font-size: 20px;
      padding: 14px 28px; background: var(--color-coral); color: #fff;
      border: 3px solid var(--color-ink); border-radius: 16px;
      box-shadow: 4px 4px 0 var(--color-ink); cursor: pointer; text-decoration: none;
      text-align: center; transition: transform 0.1s, box-shadow 0.1s;
      width: 100%; box-sizing: border-box;
    }
    .btn-cta:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--color-ink); }

    /* Victory */
    .victory-modal { text-align: center; }
    .trophy { font-size: 72px; margin-bottom: 8px; }
    .victory-modal h2 { font-family: 'Fredoka One', cursive; font-size: 32px; color: var(--color-coral); margin: 0 0 4px; }
    .victory-modal h3 { font-family: 'Fredoka One', cursive; font-size: 20px; margin: 0 0 20px; opacity: 0.7; }
    .stat { font-family: 'Nunito', sans-serif; font-size: 16px; margin: 0 0 8px; }

    /* Confetti */
    .confetti-container { position: fixed; inset: 0; pointer-events: none; z-index: 2000; overflow: hidden; }
    .confetti-piece {
      position: absolute; width: 10px; height: 10px; border-radius: 2px;
      animation: confettiFall 1.5s ease-out forwards;
    }
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
  `],
})
export class PlayComponent implements OnInit, OnDestroy {
  @ViewChild('mapRef') mapRef?: MapComponent;
  @ViewChild('photoCapture') photoCaptureRef?: ElementRef<HTMLInputElement>;
  @ViewChild('videoCapture') videoCaptureRef?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryPicker') galleryPickerRef?: ElementRef<HTMLInputElement>;

  hunt: Hunt | null = null;
  progress: PlayerProgress | null = null;

  answerInput = '';
  selectedOptionIds: string[] = [];
  mediaAnswer: File | null = null;
  mediaPreviewUrl = '';

  currentEnigmaIndex = 0;
  wrongAnswer = false;
  shakeAnswer = false;
  sheetExpanded = false;
  showRules = false;
  showVictory = false;
  showConfetti = false;
  isCompleted = false;
  completionTime = '';
  confettiItems = Array.from({ length: 50 }, (_, i) => i);
  private confettiTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public i18n: I18nService,
    private storage: StorageService,
    private huntService: HuntService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    const hunt = this.storage.getHuntByCode(code);
    if (!hunt) { this.router.navigate(['/']); return; }
    this.hunt = hunt;

    let progress = this.storage.getPlayerProgress(code);
    if (!progress) {
      progress = {
        huntCode: code, currentStepIndex: 0,
        completedStepIds: [], startedAt: new Date().toISOString(), hintsUsed: 0,
      };
      this.storage.savePlayerProgress(progress);
    }
    this.progress = progress;
    this.isCompleted = progress.currentStepIndex >= hunt.steps.length;
    if (!this.storage.getRulesSeen(code)) this.showRules = true;
  }

  ngOnDestroy(): void {
    if (this.confettiTimer) clearTimeout(this.confettiTimer);
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
  }

  dismissRules(): void {
    this.showRules = false;
    if (this.hunt) this.storage.setRulesSeen(this.hunt.accessCode);
  }

  onMarkerClick(index: number): void {
    if (!this.progress) return;
    if (index <= this.progress.currentStepIndex) this.mapRef?.flyToStep(index);
  }

  // ── Answer helpers ────────────────────────────────────────────────

  isSelected(optId: string): boolean {
    return this.selectedOptionIds.includes(optId);
  }

  toggleSelectOption(optId: string, type: string): void {
    if (type === 'radio') {
      this.selectedOptionIds = [optId];
    } else if (this.selectedOptionIds.includes(optId)) {
      this.selectedOptionIds = this.selectedOptionIds.filter(id => id !== optId);
    } else {
      this.selectedOptionIds = [...this.selectedOptionIds, optId];
    }
  }

  onMediaSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
    this.mediaAnswer = file;
    this.mediaPreviewUrl = file ? URL.createObjectURL(file) : '';
    (event.target as HTMLInputElement).value = '';
  }

  clearMedia(): void {
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
    this.mediaAnswer = null;
    this.mediaPreviewUrl = '';
  }

  // ── Submit ────────────────────────────────────────────────────────

  submitAnswer(): void {
    if (!this.hunt || !this.progress) return;
    const step = this.hunt.steps[this.progress.currentStepIndex];
    if (!step) return;
    const enigma = step.enigmas?.[this.currentEnigmaIndex];
    if (!enigma) return;

    if (enigma.answer.type === 'text' && !this.answerInput.trim()) return;
    if ((enigma.answer.type === 'checkbox' || enigma.answer.type === 'radio') && this.selectedOptionIds.length === 0) return;
    if (enigma.answer.type === 'media' && !this.mediaAnswer) return;

    const correct = this.huntService.checkAnswer(
      this.answerInput,
      this.selectedOptionIds,
      enigma.answer,
      this.mediaAnswer,
    );

    if (correct) {
      this.handleEnigmaCorrect(step);
    } else {
      this.handleWrong();
    }
  }

  private handleEnigmaCorrect(step: Step): void {
    this.answerInput = '';
    this.selectedOptionIds = [];
    this.clearMedia();
    this.wrongAnswer = false;
    this.triggerConfetti();

    if (this.currentEnigmaIndex < step.enigmas.length - 1) {
      this.currentEnigmaIndex++;
    } else {
      this.currentEnigmaIndex = 0;
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    if (!this.hunt || !this.progress) return;
    const newCompleted = [...this.progress.completedStepIds, this.hunt.steps[this.progress.currentStepIndex].id];
    const nextIndex = this.progress.currentStepIndex + 1;
    this.progress = { ...this.progress, currentStepIndex: nextIndex, completedStepIds: newCompleted };
    this.storage.savePlayerProgress(this.progress);

    if (nextIndex >= this.hunt.steps.length) {
      const done = { ...this.progress, completedAt: new Date().toISOString() };
      this.storage.savePlayerProgress(done);
      this.progress = done;
      this.isCompleted = true;
      const ms = new Date(done.completedAt!).getTime() - new Date(done.startedAt).getTime();
      this.completionTime = this.i18n.formatDuration(ms);
      setTimeout(() => { this.showVictory = true; }, 2000);
    } else {
      this.mapRef?.flyToStep(nextIndex);
    }
  }

  private handleWrong(): void {
    this.wrongAnswer = true;
    this.shakeAnswer = true;
    setTimeout(() => { this.shakeAnswer = false; }, 500);
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.confettiTimer = setTimeout(() => { this.showConfetti = false; }, 1800);
  }

  confettiStyle(i: number): string {
    const colors = ['#FF6B6B', '#FFE66D', '#6BCB77', '#4ECDC4'];
    const color = colors[i % colors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const dur = 1.2 + Math.random() * 0.6;
    return `left:${left}%;top:-20px;background:${color};animation-delay:${delay}s;animation-duration:${dur}s`;
  }
}
