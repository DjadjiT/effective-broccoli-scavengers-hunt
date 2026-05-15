import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { StorageService } from '../../services/storage.service';
import { HuntService } from '../../services/hunt.service';
import {
  Hunt,
  PlayerProgress,
  Step,
  Enigma,
  AnswerSubmission,
  AnswerStatus,
} from '../../../types';
import { MapComponent } from '../../components/map/map.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { assertFileSize } from '../../lib/media.utils';
import { MarkdownPipe } from '../../lib/markdown.pipe';
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MapComponent,
    ModalComponent,
    ProgressBarComponent,
    MarkdownPipe,
  ],
  template: `
    <div class="play-page">
      <div class="map-full">
        @if (hunt) {
          <app-map
            #mapRef
            [steps]="hunt.steps"
            [activeStepIndex]="selectedStepIndex"
            [completedStepIds]="progress?.completedStepIds ?? []"
            [pendingStepIds]="pendingStepIds"
            (markerClick)="onMarkerClick($event)"
          ></app-map>
        }

        <header class="play-header">
          <a routerLink="/" class="back-pill">← Accueil</a>
          @if (hunt) {
            <span class="hunt-title-pill">{{ hunt.name }}</span>
          }
          @if (countdownDisplay && hunt?.status === 'started' && !isCompleted) {
            <span class="countdown-pill-header" [class.countdown-urgent]="countdownUrgent">
              ⏱ {{ countdownDisplay }}
            </span>
          }
        </header>

        @if (teamId) {
          <div class="team-pill">👥 {{ teamName }}</div>
        }
      </div>

      <!-- Points toast -->
      @if (showPointsToast) {
        <div class="points-toast">+{{ pointsJustEarned }} ⭐</div>
      }

      <!-- Bottom sheet -->
      @if (hunt && progress) {
        <div class="bottom-sheet"
          [class.has-step]="selectedStepIndex !== -1"
          [class.completed]="isCompleted"
          [class.expanded]="sheetExpanded">

          <div class="sheet-handle" (click)="sheetExpanded = !sheetExpanded"></div>

          <div class="sheet-progress">
            <app-progress-bar
              [current]="progress.completedStepIds.length"
              [total]="hunt.steps.length"
            ></app-progress-bar>
          </div>

          <div class="sheet-content">
            @if (showMyAnswers) {
              <div class="my-answers-panel">
                <div class="my-answers-header">
                  <h3 class="my-answers-title">📋 Mes réponses</h3>
                  <button class="my-answers-close" (click)="showMyAnswers = false">✕</button>
                </div>
                <div class="my-score-summary">
                  <span class="my-score-approved">⭐ {{ myApprovedScore }} pts validés</span>
                  @if (pendingPoints > 0) {
                    <span class="my-score-pending">⏳ {{ pendingPoints }} pts en attente</span>
                  }
                </div>
                @if (myTeamSubmissions.length === 0) {
                  <p class="my-no-subs">Aucune réponse soumise pour l'instant.</p>
                } @else {
                  <div class="my-sub-list">
                    @for (s of myTeamSubmissions; track s.id) {
                      <div class="my-sub-item" [ngClass]="'my-status-' + s.status">
                        <div class="my-sub-row">
                          <div class="my-sub-info">
                            <span class="my-sub-step">{{ s.stepTitle }}</span>
                            <span class="my-sub-enigma">{{ s.enigmaTitle }}</span>
                          </div>
                          <div class="my-sub-right">
                            <span class="my-sub-badge my-badge-{{ s.status }}">
                              {{ s.status === 'approved' ? '✅' : s.status === 'rejected' ? '❌' : '⏳' }}
                              {{ s.status === 'approved' ? 'Validée' : s.status === 'rejected' ? 'Refusée' : 'En attente' }}
                            </span>
                            @if (s.status === 'approved') {
                              <span class="my-sub-pts">+{{ s.pointsAwarded }} pts</span>
                            }
                          </div>
                        </div>
                        @if (s.reviewNote) {
                          <p class="my-sub-note">💬 {{ s.reviewNote }}</p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            } @else if (isCompleted) {
              <div class="done-summary">
                <p class="step-done">🎉 Chasse terminée !</p>
                <div class="done-scores">
                  <div class="done-score-item done-score-main">
                    <span class="done-score-label">Score validé</span>
                    <span class="done-score-val">⭐ {{ earnedPoints }}
                      @if (totalPossiblePoints > 0) { / {{ totalPossiblePoints }} pts }
                    </span>
                  </div>
                  @if (pendingPoints > 0) {
                    <div class="done-score-item done-score-pending">
                      <span class="done-score-label">En attente</span>
                      <span class="done-score-val">⏳ {{ pendingPoints }} pts</span>
                    </div>
                  }
                </div>
                <div class="done-btns">
                  <button class="btn-leaderboard" (click)="openLeaderboard()">
                    🏅 Classement
                  </button>
                  <button class="btn-my-answers" (click)="openMyAnswers()">
                    📋 Mes réponses
                  </button>
                </div>
              </div>

            } @else if (selectedStepIndex === -1) {
              <!-- Nothing selected -->
              <div class="no-selection">
                <span class="no-sel-icon">👆</span>
                <p class="no-sel-text">Sélectionnez une étape sur la carte</p>
                <div class="no-sel-meta">
                  @if (remaining > 0) {
                    <span class="no-sel-count">
                      {{ remaining }} étape{{ remaining > 1 ? 's' : '' }} restante{{ remaining > 1 ? 's' : '' }}
                    </span>
                  }
                  @if (totalPossiblePoints > 0) {
                    <span class="score-pill">⭐ {{ earnedPoints }} / {{ totalPossiblePoints }} pts</span>
                  }
                </div>
                @if (myTeamSubmissions.length > 0) {
                  <button class="btn-my-answers" (click)="openMyAnswers()">
                    📋 Mes réponses ({{ myTeamSubmissions.length }})
                  </button>
                }
              </div>

            } @else {
              <!-- Step selected -->
              @let step = hunt.steps[selectedStepIndex];
              @let enigma = step?.enigmas?.[currentEnigmaIndex];
              <div class="step-info">
                <div class="step-header">
                  <span class="step-badge">{{ selectedStepIndex + 1 }}</span>
                  <h3 class="step-title">{{ step?.title }}</h3>
                  <button class="btn-close-step" (click)="deselectStep()" title="Fermer">✕</button>
                </div>

                <!-- Multi-enigma progress dots -->
                @if ((step?.enigmas?.length ?? 0) > 1) {
                  <div class="enigma-progress">
                    @for (e of step!.enigmas; track e.id; let i = $index) {
                      <span class="enigma-dot"
                        [class.active]="i === currentEnigmaIndex"
                        [class.done]="i < currentEnigmaIndex && !isEnigmaPending(e.id, e.answer.type)"
                        [class.pending]="isEnigmaPending(e.id, e.answer.type)">
                        {{ isEnigmaPending(e.id, e.answer.type) ? '⏳' : i + 1 }}
                      </span>
                    }
                  </div>
                }

                @if (enigma?.title || (enigma?.points ?? 0) > 0) {
                  <div class="enigma-meta">
                    @if (enigma?.title) {
                      <h4 class="enigma-title">{{ enigma!.title }}</h4>
                    }
                    @if ((enigma?.points ?? 0) > 0) {
                      <span class="enigma-pts-badge">⭐ {{ enigma!.points }} pts</span>
                    }
                  </div>
                }

                <!-- Step media strip -->
                @if ((step?.media ?? []).length > 0) {
                  <div class="step-media-strip">
                    @for (m of step!.media; track m.id) {
                      @if (m.type === 'image') {
                        <img class="step-media-item" [src]="m.url" [alt]="m.name"
                          (click)="openMediaLightbox(m.url)" />
                      } @else if (m.type === 'video') {
                        <video class="step-media-item step-media-video"
                          [src]="m.url" controls playsinline></video>
                      } @else if (m.type === 'audio') {
                        <div class="step-media-audio-card">
                          <span class="step-media-audio-name">🎵 {{ m.name }}</span>
                          <audio class="step-media-audio" [src]="m.url" controls></audio>
                        </div>
                      } @else {
                        <div class="step-media-file-card">
                          <span class="step-media-file-icon">📄</span>
                          <span class="step-media-file-name">{{ m.name }}</span>
                        </div>
                      }
                    }
                  </div>
                }

                <div class="enigma-text md-render" [innerHTML]="enigma?.description | md"></div>

                <div [class.shake-answer]="shakeAnswer">

                  <!-- Text type -->
                  @if (enigma?.answer?.type === 'text') {
                    @if (isEnigmaPending(enigma!.id, 'text') && !editingPendingEnigmaIds.has(enigma!.id)) {
                      <div class="pending-block">
                        <div class="pending-badge">⏳ En attente de validation</div>
                        <p class="pending-text-val">"{{ getPendingTextAnswer(enigma!.id) }}"</p>
                        <button class="btn-modify" (click)="startEditPending(enigma!.id)">✏️ Modifier ma réponse</button>
                      </div>
                    } @else {
                      <div class="answer-row">
                        <input type="text" class="answer-input"
                          [(ngModel)]="answerInput"
                          [placeholder]="i18n.t('answer') + '...'"
                          (keydown.enter)="submitAnswer()" />
                        <button class="btn-validate" (click)="submitAnswer()">
                          {{ i18n.t('validate') }}
                        </button>
                      </div>
                    }
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
                            (change)="toggleSelectOption(opt.id, enigma!.answer.type)" />
                          <span class="option-play-label">{{ opt.label }}</span>
                        </label>
                      }
                    </div>
                    <button class="btn-validate btn-validate-full" (click)="submitAnswer()">
                      {{ i18n.t('validate') }}
                    </button>
                  }

                  <!-- Media type -->
                  @if (enigma?.answer?.type === 'media') {
                    @if (isEnigmaPending(enigma!.id, 'media') && !editingPendingEnigmaIds.has(enigma!.id)) {
                      <div class="pending-block">
                        <div class="pending-badge">⏳ En attente de validation</div>
                        <button class="btn-modify" (click)="startEditPending(enigma!.id)">✏️ Modifier ma réponse</button>
                      </div>
                    } @else {
                    <div class="media-answer-section">
                      <input #photoCapture type="file" accept="image/*"
                        [attr.capture]="'environment'" style="display:none"
                        (change)="onMediaSelected($event)" />
                      <input #videoCapture type="file" accept="video/*"
                        [attr.capture]="'environment'" style="display:none"
                        (change)="onMediaSelected($event)" />
                      <input #galleryPicker type="file" accept="image/*,video/*"
                        style="display:none" (change)="onMediaSelected($event)" />

                      @if (mediaError) {
                        <p class="media-error-msg">{{ mediaError }}</p>
                      }
                      @if (!mediaAnswer && !mediaUrl) {
                        <div class="media-upload-btns">
                          @if (enigma!.answer.mediaAccept.photo) {
                            <button class="btn-media"
                              (click)="photoCaptureRef?.nativeElement?.click()">
                              📷 Prendre une photo
                            </button>
                          }
                          @if (enigma!.answer.mediaAccept.video) {
                            <button class="btn-media"
                              (click)="videoCaptureRef?.nativeElement?.click()">
                              🎥 Filmer
                            </button>
                          }
                          <button class="btn-media btn-media-gallery"
                            (click)="galleryPickerRef?.nativeElement?.click()">
                            🖼️ Depuis la galerie
                          </button>
                          <div class="media-or">— ou —</div>
                          <div class="media-url-row">
                            <input
                              type="url"
                              class="media-url-input"
                              [(ngModel)]="mediaUrl"
                              placeholder="https://exemple.com/photo.jpg"
                            />
                          </div>
                        </div>
                      } @else if (mediaAnswer) {
                        <div class="media-selected">
                          @if (mediaAnswer.type.startsWith('image/')) {
                            <img class="media-preview-img" [src]="mediaPreviewUrl" alt="Aperçu" />
                          } @else if (mediaAnswer.type.startsWith('video/')) {
                            <video class="media-preview-video" [src]="mediaPreviewUrl" controls></video>
                          } @else {
                            <div class="media-preview-file">📄 {{ mediaAnswer.name }}</div>
                          }
                          <button class="btn-media-rm" (click)="clearMedia()">✕ Changer</button>
                        </div>
                      } @else {
                        <div class="media-selected">
                          <img class="media-preview-img" [src]="mediaUrl" alt="Aperçu" />
                          <button class="btn-media-rm" (click)="clearMedia()">✕ Changer</button>
                        </div>
                      }

                      <button class="btn-validate btn-validate-full"
                        (click)="submitAnswer()" [disabled]="!mediaAnswer && !mediaUrl.trim()">
                        {{ i18n.t('validate') }}
                      </button>
                    </div>
                    }
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

    <!-- Hunt intro overlay -->
    @if (showIntro && hunt) {
      <div class="intro-overlay">
        <div class="intro-card">
          <div class="intro-header">
            <h1 class="intro-hunt-name">{{ hunt.name }}</h1>
            @if (teamName && teamName !== 'Joueur solo') {
              <div class="intro-team-badge">👥 {{ teamName }}</div>
            }
          </div>

          @if (hunt.description) {
            <div class="intro-description md-render" [innerHTML]="hunt.description | md"></div>
          }

          @if ((hunt.media ?? []).length > 0) {
            <div class="intro-media-gallery">
              @for (m of hunt.media ?? []; track m.id) {
                @if (m.type === 'image') {
                  <img class="intro-media-img" [src]="m.url" [alt]="m.name"
                    (click)="openMediaLightbox(m.url)" />
                } @else if (m.type === 'video') {
                  <video class="intro-media-video" [src]="m.url" controls playsinline></video>
                } @else if (m.type === 'audio') {
                  <div class="intro-media-audio">
                    <span class="intro-media-audio-name">🎵 {{ m.name }}</span>
                    <audio [src]="m.url" controls style="width:100%"></audio>
                  </div>
                } @else {
                  <div class="intro-media-file">
                    <span style="font-size:32px">📄</span>
                    <span class="intro-media-file-name">{{ m.name }}</span>
                  </div>
                }
              }
            </div>
          }

          <div class="intro-stats">
            <div class="intro-stat">
              <span class="intro-stat-icon">🗺️</span>
              <span class="intro-stat-val">{{ hunt.steps.length }}</span>
              <span class="intro-stat-lbl">étape{{ hunt.steps.length > 1 ? 's' : '' }}</span>
            </div>
            @if (totalPossiblePoints > 0) {
              <div class="intro-stat">
                <span class="intro-stat-icon">⭐</span>
                <span class="intro-stat-val">{{ totalPossiblePoints }}</span>
                <span class="intro-stat-lbl">points</span>
              </div>
            }
          </div>

          @if (waitingForStart) {
            <div class="waiting-indicator">
              <div class="wait-dots"><span></span><span></span><span></span></div>
              <p>En attente du démarrage par l'organisateur…</p>
            </div>
          } @else {
            <button class="btn-start-hunt" (click)="startHunt()">
              🚀 Commencer la chasse
            </button>
          }
        </div>
      </div>
    }

    <!-- Waiting overlay (shown after intro dismissed but hunt not started yet) -->
    @if (waitingForStart && !showIntro) {
      <div class="waiting-overlay">
        <div class="waiting-card">
          <div class="waiting-icon">⏳</div>
          <h2>En attente du démarrage</h2>
          <p>L'organisateur n'a pas encore lancé la chasse.</p>
          @if (hunt?.name) {
            <div class="waiting-hunt-name">{{ hunt!.name }}</div>
          }
          @if (teamName && teamName !== 'Joueur solo') {
            <div class="waiting-team-badge">👥 {{ teamName }}</div>
          }
          <div class="wait-dots waiting-dots-lg"><span></span><span></span><span></span></div>
        </div>
      </div>
    }

    <!-- Lightbox -->
    @if (lightboxUrl) {
      <div class="lightbox-overlay" (click)="lightboxUrl = ''">
        <img class="lightbox-img" [src]="lightboxUrl" alt="Média" (click)="$event.stopPropagation()" />
        <button class="lightbox-close" (click)="lightboxUrl = ''">✕</button>
      </div>
    }

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

    <!-- Status snackbar -->
    @if (statusSnack) {
      <div class="status-snack" [ngClass]="statusSnackClass">{{ statusSnack }}</div>
    }

    <!-- Confetti -->
    @if (showConfetti) {
      <div class="confetti-container">
        @for (i of confettiItems; track i) {
          <div class="confetti-piece" [style]="confettiStyle(i)"></div>
        }
      </div>
    }

    <!-- Victory modal -->
    <app-modal [visible]="showVictory" [closeOnBackdrop]="true" (close)="showVictory = false">
      <div class="victory-modal">
        <button class="btn-modal-close" (click)="showVictory = false" aria-label="Fermer">✕</button>
        <div class="trophy">🏆</div>
        <h2>{{ i18n.t('congratulations') }}</h2>
        <h3>{{ hunt?.name }}</h3>

        <!-- Score block -->
        @if (totalPossiblePoints > 0) {
          <div class="victory-score-block">
            <div class="vsb-team">{{ teamName || 'Joueur solo' }}</div>
            <div class="vsb-pts">
              <span class="vsb-num">{{ earnedPoints }}</span>
              <span class="vsb-sep"> / {{ totalPossiblePoints }} pts</span>
            </div>
            <div class="vsb-bar-wrap">
              <div class="vsb-bar" [style.width.%]="totalPossiblePoints ? (earnedPoints / totalPossiblePoints * 100) : 0"></div>
            </div>
          </div>
        }

        <!-- Stats row -->
        <div class="victory-stats">
          @if (completionTime) {
            <div class="vstat">
              <span class="vstat-icon">⏱</span>
              <span class="vstat-val">{{ completionTime }}</span>
            </div>
          }
          <div class="vstat">
            <span class="vstat-icon">💡</span>
            <span class="vstat-val">{{ progress?.hintsUsed ?? 0 }} indice{{ (progress?.hintsUsed ?? 0) > 1 ? 's' : '' }}</span>
          </div>
        </div>

        <!-- Leaderboard -->
        @if (leaderboard.length > 0) {
          <div class="lb-section">
            <h4 class="lb-title">🏅 Classement</h4>
            <div class="lb-list">
              @for (entry of leaderboard; track entry.teamId; let i = $index) {
                <div class="lb-row" [class.lb-me]="entry.isCurrentTeam">
                  <span class="lb-rank">
                    @if (rankMedal(i)) { {{ rankMedal(i) }} } @else { {{ i + 1 }} }
                  </span>
                  <span class="lb-name">{{ entry.teamName }}</span>
                  <span class="lb-pts">{{ entry.points }} pts</span>
                </div>
              }
            </div>
          </div>
        }

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
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; z-index: 500; pointer-events: none;
    }
    .play-header > * { pointer-events: all; }
    .back-pill {
      background: var(--color-paper); border: 2px solid var(--color-ink);
      border-radius: 20px; padding: 6px 12px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      color: var(--color-ink); text-decoration: none; box-shadow: 3px 3px 0 var(--color-ink);
      flex-shrink: 0;
    }
    .hunt-title-pill {
      flex: 1;
      background: var(--color-paper); border: 2px solid var(--color-ink);
      border-radius: 20px; padding: 6px 12px;
      font-family: 'Fredoka One', cursive; font-size: 14px; line-height: 1.25;
      color: var(--color-ink); box-shadow: 3px 3px 0 var(--color-ink);
      text-align: center;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .countdown-pill-header {
      background: var(--color-ink); color: #fff;
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 20px; padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px;
      letter-spacing: 1px; box-shadow: 3px 3px 0 rgba(0,0,0,0.25);
      flex-shrink: 0; white-space: nowrap; pointer-events: none;
    }
    .countdown-pill-header.countdown-urgent {
      background: var(--color-coral);
      animation: urgentPulse 0.8s ease-in-out infinite alternate;
    }
    @keyframes urgentPulse {
      from { opacity: 1; transform: scale(1); }
      to   { opacity: 0.85; transform: scale(1.04); }
    }
    .team-pill {
      position: absolute; top: 52px; left: 12px;
      background: var(--color-mint); color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 20px; padding: 4px 12px;
      font-family: 'Fredoka One', cursive; font-size: 12px;
      box-shadow: 2px 2px 0 var(--color-ink); z-index: 500;
      white-space: nowrap; max-width: calc(100% - 24px);
      overflow: hidden; text-overflow: ellipsis;
    }

    /* ── Bottom sheet ── */
    .bottom-sheet {
      background: var(--color-paper);
      border-top: 3px solid var(--color-ink);
      border-radius: 24px 24px 0 0;
      /* compact when nothing selected */
      height: 14vh;
      transition: height 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
      box-shadow: 0 -6px 0 var(--color-ink);
      display: flex; flex-direction: column;
    }
    /* Expand when a step is selected or hunt is complete */
    .bottom-sheet.has-step,
    .bottom-sheet.completed { height: 44vh; }
    .bottom-sheet.expanded  { height: 75vh; }

    .sheet-handle {
      width: 40px; height: 4px; background: rgba(45,45,45,0.3);
      border-radius: 2px; margin: 12px auto; cursor: pointer; flex-shrink: 0;
    }
    .sheet-progress {
      padding: 0 20px 8px; flex-shrink: 0;
    }
    .sheet-content {
      padding: 0 20px 20px; overflow-y: auto; flex: 1;
      display: flex; flex-direction: column; gap: 14px;
    }

    /* ── No selection state ── */
    .no-selection {
      display: flex; flex-direction: column; align-items: center;
      gap: 6px; padding: 4px 0;
    }
    .no-sel-icon { font-size: 28px; }
    .no-sel-text {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px;
      color: var(--color-ink); opacity: 0.75; text-align: center; margin: 0;
    }
    /* ── Step info ── */
    .step-info { display: flex; flex-direction: column; gap: 12px; }
    .step-header { display: flex; align-items: center; gap: 12px; }
    .step-badge {
      width: 36px; height: 36px; background: var(--color-coral);
      border: 2px solid var(--color-ink); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 18px; color: #fff; flex-shrink: 0;
    }
    .step-title {
      font-family: 'Fredoka One', cursive; font-size: 20px; margin: 0;
      color: var(--color-ink); flex: 1;
    }
    .btn-close-step {
      width: 32px; height: 32px; flex-shrink: 0;
      background: none; border: 2px solid rgba(45,45,45,0.2); border-radius: 50%;
      font-size: 13px; cursor: pointer; color: var(--color-ink);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.12s; opacity: 0.6;
    }
    .btn-close-step:hover { background: rgba(45,45,45,0.08); opacity: 1; }

    /* Enigma progress dots */
    .enigma-progress { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .enigma-dot {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid var(--color-ink); background: var(--color-cream);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Fredoka One', cursive; font-size: 11px;
      color: var(--color-ink); opacity: 0.4; transition: all 0.2s;
    }
    .enigma-dot.active   { background: var(--color-coral);  color: #fff; opacity: 1; }
    .enigma-dot.done     { background: var(--color-mint);   color: #fff; opacity: 1; }
    .enigma-dot.pending  { background: var(--color-lemon);  color: var(--color-ink); opacity: 1; font-size: 13px; }

    .enigma-text {
      font-family: 'Nunito', sans-serif; font-size: 15px; line-height: 1.6;
      color: var(--color-ink); margin: 0;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 14px 16px;
    }
    .md-render p  { margin: 0 0 0.5em; }
    .md-render p:last-child { margin-bottom: 0; }
    .md-render h1, .md-render h2, .md-render h3 { font-family: 'Fredoka One', cursive; margin: 0.4em 0 0.2em; }
    .md-render ul, .md-render ol { padding-left: 18px; margin: 0 0 0.5em; }
    .md-render strong { font-weight: 800; }
    .md-render a { color: var(--color-sky); }
    .md-render code { font-family: monospace; background: rgba(45,45,45,0.08); padding: 1px 4px; border-radius: 4px; }
    .md-render blockquote { border-left: 3px solid var(--color-coral); margin: 0.3em 0; padding: 2px 10px; }
    .md-render ::ng-deep img, .md-render ::ng-deep video { width: 100%; height: auto; display: block; border-radius: 8px; }

    /* Answer inputs */
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
      box-shadow: 3px 3px 0 var(--color-ink); transition: transform 0.1s, box-shadow 0.1s; white-space: nowrap;
    }
    .btn-validate:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-validate:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--color-ink); }
    .btn-validate:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .btn-validate-full { width: 100%; margin-top: 4px; }

    /* Options */
    .options-play { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
    .options-play.wrong .option-play-row { border-color: var(--color-coral); }
    .option-play-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 14px; cursor: pointer;
      font-family: 'Nunito', sans-serif; font-size: 15px; transition: background 0.12s, border-color 0.12s;
    }
    .option-play-row input { accent-color: var(--color-coral); width: 18px; height: 18px; flex-shrink: 0; cursor: pointer; }
    .option-play-row.selected { background: rgba(255,107,107,0.1); border-color: var(--color-coral); }
    .option-play-label { flex: 1; line-height: 1.4; }

    /* Media */
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
    .media-preview-img { width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; border: 2px solid var(--color-ink); }
    .media-preview-video { width: 100%; border-radius: 12px; border: 2px solid var(--color-ink); }
    .media-preview-file { padding: 16px; background: var(--color-cream); border: 2px solid var(--color-ink); border-radius: 12px; font-family: 'Nunito', sans-serif; font-size: 14px; width: 100%; text-align: center; box-sizing: border-box; }
    .btn-media-rm { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px; background: none; border: 2px solid rgba(45,45,45,0.3); border-radius: 10px; padding: 6px 12px; cursor: pointer; color: var(--color-ink); opacity: 0.65; }
    .btn-media-rm:hover { border-color: var(--color-coral); color: var(--color-coral); opacity: 1; }
    .media-error-msg { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px; color: var(--color-coral); margin: 0 0 4px; }
    .media-or { text-align: center; font-family: 'Nunito', sans-serif; font-size: 12px; opacity: 0.5; margin: 2px 0; }
    .media-url-row { display: flex; }
    .media-url-input {
      flex: 1;
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      padding: 10px 12px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      background: var(--color-paper);
      outline: none;
      box-sizing: border-box;
    }
    .media-url-input:focus { border-color: var(--color-sky); box-shadow: 3px 3px 0 var(--color-sky); }

    /* Pending state */
    .pending-block {
      display: flex; flex-direction: column; gap: 10px;
      padding: 14px; background: #FFFBE0;
      border: 2px solid var(--color-ink); border-radius: 14px;
    }
    .pending-badge {
      font-family: 'Fredoka One', cursive; font-size: 14px;
      color: var(--color-ink);
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 10px; padding: 4px 12px; width: fit-content;
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .pending-text-val {
      font-family: 'Nunito', sans-serif; font-size: 14px; color: var(--color-ink);
      background: var(--color-paper); border: 2px solid rgba(45,45,45,0.15);
      border-radius: 10px; padding: 10px 12px; margin: 0; font-style: italic;
      word-break: break-word;
    }
    .btn-modify {
      align-self: flex-start;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px;
      background: var(--color-paper); color: var(--color-ink);
      border: 2px solid var(--color-ink); border-radius: 10px;
      padding: 7px 14px; cursor: pointer;
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .btn-modify:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--color-ink); }

    .wrong-msg { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px; color: var(--color-coral); margin: 0; }
    .step-done { font-family: 'Fredoka One', cursive; font-size: 22px; text-align: center; margin: 0; }
    .done-summary {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 8px 0;
    }
    .done-scores {
      display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; width: 100%;
    }
    .done-score-item {
      flex: 1; min-width: 120px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 10px 14px;
      border: 2px solid var(--color-ink); border-radius: 14px;
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .done-score-main  { background: var(--color-lemon); }
    .done-score-pending { background: #FFFBE0; }
    .done-score-label {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.65;
    }
    .done-score-val {
      font-family: 'Fredoka One', cursive; font-size: 17px; color: var(--color-ink);
    }
    .btn-leaderboard {
      font-family: 'Fredoka One', cursive; font-size: 15px;
      padding: 10px 22px;
      background: var(--color-coral); color: #fff;
      border: 2px solid var(--color-ink); border-radius: 14px;
      box-shadow: 3px 3px 0 var(--color-ink);
      cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
      width: 100%;
    }
    .btn-leaderboard:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--color-ink); }

    .done-btns { display: flex; gap: 10px; width: 100%; }
    .done-btns .btn-leaderboard { flex: 1; }
    .btn-my-answers {
      flex: 1;
      font-family: 'Fredoka One', cursive; font-size: 15px;
      padding: 10px 22px;
      background: var(--color-lemon); color: var(--color-ink);
      border: 2px solid var(--color-ink); border-radius: 14px;
      box-shadow: 3px 3px 0 var(--color-ink);
      cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
      width: 100%;
    }
    .btn-my-answers:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--color-ink); }

    /* ── My answers panel ── */
    .my-answers-panel { display: flex; flex-direction: column; gap: 12px; }
    .my-answers-header {
      display: flex; justify-content: space-between; align-items: center;
    }
    .my-answers-title {
      font-family: 'Fredoka One', cursive; font-size: 18px;
      color: var(--color-ink); margin: 0;
    }
    .my-answers-close {
      background: none; border: 2px solid var(--color-ink); border-radius: 8px;
      width: 30px; height: 30px; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .my-score-summary {
      display: flex; gap: 10px; flex-wrap: wrap;
      padding: 10px 14px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink); border-radius: 12px;
    }
    .my-score-approved {
      font-family: 'Fredoka One', cursive; font-size: 15px; color: var(--color-ink);
    }
    .my-score-pending {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px;
      color: var(--color-ink); opacity: 0.7;
    }
    .my-no-subs {
      font-family: 'Nunito', sans-serif; font-size: 14px;
      color: var(--color-ink); opacity: 0.6; text-align: center; padding: 20px 0;
    }
    .my-sub-list { display: flex; flex-direction: column; gap: 8px; }
    .my-sub-item {
      padding: 10px 12px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .my-status-approved { background: #E3F8E6; }
    .my-status-pending  { background: #FFFBE0; }
    .my-status-rejected { background: #FFE3E3; }
    .my-sub-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .my-sub-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .my-sub-step {
      font-family: 'Fredoka One', cursive; font-size: 14px; color: var(--color-ink);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .my-sub-enigma {
      font-family: 'Nunito', sans-serif; font-size: 12px;
      color: var(--color-ink); opacity: 0.65;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .my-sub-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .my-sub-badge {
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 11px;
      padding: 2px 8px; border-radius: 8px; border: 2px solid var(--color-ink);
      white-space: nowrap;
    }
    .my-badge-approved { background: #C8F0CC; }
    .my-badge-pending  { background: var(--color-lemon); }
    .my-badge-rejected { background: #FFD0D0; }
    .my-sub-pts {
      font-family: 'Fredoka One', cursive; font-size: 13px; color: var(--color-ink);
    }
    .my-sub-note {
      font-family: 'Nunito', sans-serif; font-size: 12px;
      color: var(--color-ink); opacity: 0.75;
      margin: 2px 0 0; padding: 6px 8px;
      background: rgba(45,45,45,0.05); border-radius: 6px;
    }

    /* ── Points toast ── */
    .points-toast {
      position: absolute; bottom: calc(14vh + 20px); left: 50%; transform: translateX(-50%);
      background: var(--color-lemon); border: 3px solid var(--color-ink);
      border-radius: 24px; padding: 8px 20px;
      font-family: 'Fredoka One', cursive; font-size: 22px; color: var(--color-ink);
      box-shadow: 4px 4px 0 var(--color-ink); z-index: 600; pointer-events: none;
      animation: toastUp 1.8s ease-out forwards;
    }
    @keyframes toastUp {
      0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.8); }
      15%  { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1.08); }
      30%  { transform: translateX(-50%) translateY(0) scale(1); }
      70%  { opacity: 1; transform: translateX(-50%) translateY(-20px); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
    }

    /* ── No-selection meta row ── */
    .no-sel-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .no-sel-count {
      font-family: 'Fredoka One', cursive; font-size: 13px;
      color: var(--color-sky); letter-spacing: 0.2px;
    }
    .score-pill {
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 16px; padding: 3px 10px;
      font-family: 'Fredoka One', cursive; font-size: 13px; color: var(--color-ink);
      box-shadow: 2px 2px 0 var(--color-ink);
    }

    /* ── Enigma meta (title + points badge) ── */
    .enigma-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .enigma-title {
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 14px;
      color: var(--color-sky); margin: 0; flex: 1;
    }
    .enigma-pts-badge {
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 2px 10px;
      font-family: 'Fredoka One', cursive; font-size: 13px; color: var(--color-ink);
      box-shadow: 2px 2px 0 var(--color-ink); white-space: nowrap; flex-shrink: 0;
    }

    /* ── Step media strip ── */
    .step-media-strip {
      display: flex; gap: 8px;
      overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: thin; scrollbar-color: rgba(45,45,45,0.2) transparent;
    }
    .step-media-strip::-webkit-scrollbar { height: 4px; }
    .step-media-strip::-webkit-scrollbar-track { background: transparent; }
    .step-media-strip::-webkit-scrollbar-thumb { background: rgba(45,45,45,0.2); border-radius: 4px; }
    .step-media-item {
      flex-shrink: 0; height: 130px; width: auto; max-width: 220px;
      object-fit: cover; border-radius: 12px;
      border: 2px solid var(--color-ink); cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.12s, box-shadow 0.12s;
    }
    .step-media-item:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .step-media-video { cursor: default; }
    .step-media-video:hover { transform: none; box-shadow: 3px 3px 0 var(--color-ink); }
    .step-media-audio-card {
      flex-shrink: 0; min-width: 200px; max-width: 260px;
      display: flex; flex-direction: column; gap: 6px;
      padding: 10px 12px;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 12px; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .step-media-audio-name {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px;
      color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .step-media-audio { width: 100%; }
    .step-media-file-card {
      flex-shrink: 0; width: 90px; height: 130px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 12px; box-shadow: 3px 3px 0 var(--color-ink); padding: 8px; box-sizing: border-box;
    }
    .step-media-file-icon { font-size: 32px; }
    .step-media-file-name {
      font-family: 'Nunito', sans-serif; font-size: 10px; font-weight: 700;
      color: var(--color-ink); text-align: center; word-break: break-all;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }

    /* ── Hunt intro overlay ── */
    .intro-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: var(--color-paper);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 0; overflow-y: auto;
    }
    .intro-card {
      width: 100%; max-width: 540px;
      padding: 32px 24px 40px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .intro-header {
      display: flex; flex-direction: column; gap: 10px;
    }
    .intro-hunt-name {
      font-family: 'Fredoka One', cursive; font-size: 36px; line-height: 1.1;
      color: var(--color-ink); margin: 0;
    }
    .intro-team-badge {
      display: inline-flex; align-items: center;
      background: var(--color-mint); color: #fff;
      border: 2px solid var(--color-ink); border-radius: 20px;
      padding: 5px 14px; font-family: 'Fredoka One', cursive; font-size: 14px;
      box-shadow: 3px 3px 0 var(--color-ink); align-self: flex-start;
    }
    .intro-description {
      font-family: 'Nunito', sans-serif; font-size: 16px; line-height: 1.6;
      color: var(--color-ink); margin: 0; opacity: 0.85;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 16px 18px;
    }
    .intro-media-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .intro-media-img {
      width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
      border-radius: 14px; border: 2px solid var(--color-ink);
      box-shadow: 3px 3px 0 var(--color-ink); cursor: pointer;
      transition: transform 0.12s, box-shadow 0.12s;
    }
    .intro-media-img:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 var(--color-ink); }
    .intro-media-video {
      width: 100%; border-radius: 14px; border: 2px solid var(--color-ink);
      box-shadow: 3px 3px 0 var(--color-ink); display: block;
    }
    .intro-media-audio {
      grid-column: 1 / -1;
      display: flex; flex-direction: column; gap: 6px;
      padding: 12px 14px;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .intro-media-audio-name {
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 13px; color: var(--color-ink);
    }
    .intro-media-file {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      padding: 16px 10px;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .intro-media-file-name {
      font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 700;
      color: var(--color-ink); text-align: center; word-break: break-all;
    }
    .intro-stats {
      display: flex; gap: 12px; flex-wrap: wrap;
    }
    .intro-stat {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 12px 18px;
      background: var(--color-lemon); border: 2px solid var(--color-ink);
      border-radius: 14px; box-shadow: 3px 3px 0 var(--color-ink); min-width: 72px;
    }
    .intro-stat-icon { font-size: 20px; }
    .intro-stat-val { font-family: 'Fredoka One', cursive; font-size: 22px; color: var(--color-ink); }
    .intro-stat-lbl { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.4px; }
    .btn-start-hunt {
      font-family: 'Fredoka One', cursive; font-size: 22px;
      padding: 16px 28px; background: var(--color-coral); color: #fff;
      border: 3px solid var(--color-ink); border-radius: 18px;
      box-shadow: 5px 5px 0 var(--color-ink); cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s; text-align: center;
    }
    .btn-start-hunt:hover { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 var(--color-ink); }
    .btn-start-hunt:active { transform: translate(3px,3px); box-shadow: 2px 2px 0 var(--color-ink); }

    /* ── Lightbox ── */
    .lightbox-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(0,0,0,0.88);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .lightbox-img {
      max-width: 100%; max-height: 90vh;
      border-radius: 14px; border: 3px solid #fff;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      object-fit: contain;
    }
    .lightbox-close {
      position: absolute; top: 16px; right: 16px;
      width: 40px; height: 40px;
      background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4);
      border-radius: 50%; color: #fff; font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s;
    }
    .lightbox-close:hover { background: rgba(255,255,255,0.3); }

    /* Modals */
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
    /* ── Victory modal ── */
    .victory-modal { text-align: center; display: flex; flex-direction: column; gap: 16px; position: relative; }
    .btn-modal-close {
      position: absolute; top: -4px; right: -4px;
      width: 32px; height: 32px;
      background: var(--color-paper); border: 2px solid var(--color-ink);
      border-radius: 50%; font-size: 14px; line-height: 1;
      cursor: pointer; box-shadow: 2px 2px 0 var(--color-ink);
      display: flex; align-items: center; justify-content: center;
    }
    .btn-modal-close:hover { background: #FFE3E3; }
    .trophy { font-size: 72px; line-height: 1; }
    .victory-modal h2 { font-family: 'Fredoka One', cursive; font-size: 32px; color: var(--color-coral); margin: 0; }
    .victory-modal h3 { font-family: 'Fredoka One', cursive; font-size: 18px; margin: 0; opacity: 0.65; }

    .victory-score-block {
      background: var(--color-lemon);
      border: 3px solid var(--color-ink);
      border-radius: 18px;
      padding: 16px 20px;
      box-shadow: 4px 4px 0 var(--color-ink);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .vsb-team { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 13px; opacity: 0.7; }
    .vsb-pts { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
    .vsb-num { font-family: 'Fredoka One', cursive; font-size: 48px; color: var(--color-ink); line-height: 1; }
    .vsb-sep { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 16px; color: var(--color-ink); opacity: 0.6; }
    .vsb-bar-wrap {
      width: 100%; height: 10px; background: rgba(45,45,45,0.12);
      border-radius: 10px; overflow: hidden;
      border: 2px solid rgba(45,45,45,0.15);
    }
    .vsb-bar {
      height: 100%; background: var(--color-coral);
      border-radius: 10px; transition: width 1s ease;
      min-width: 4px;
    }

    .victory-stats {
      display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;
    }
    .vstat {
      display: flex; align-items: center; gap: 6px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 6px 14px;
      box-shadow: 2px 2px 0 var(--color-ink);
    }

    /* ── Leaderboard ── */
    .lb-section { text-align: left; }
    .lb-title {
      font-family: 'Fredoka One', cursive; font-size: 18px;
      color: var(--color-ink); margin: 0 0 10px; text-align: center;
    }
    .lb-list { display: flex; flex-direction: column; gap: 6px; }
    .lb-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      font-family: 'Nunito', sans-serif;
    }
    .lb-row.lb-me {
      background: #E3F8E6;
      border-color: var(--color-mint);
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .lb-rank { font-size: 18px; width: 28px; flex-shrink: 0; text-align: center; }
    .lb-name { flex: 1; font-weight: 800; font-size: 14px; color: var(--color-ink); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lb-pts { font-family: 'Fredoka One', cursive; font-size: 15px; color: var(--color-coral); white-space: nowrap; }

    /* ── Status snackbar ── */
    .status-snack {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      padding: 16px 32px;
      border: 3px solid var(--color-ink); border-radius: 22px;
      font-family: 'Fredoka One', cursive; font-size: 22px; color: var(--color-ink);
      box-shadow: 5px 5px 0 var(--color-ink);
      z-index: 3000; pointer-events: none; white-space: nowrap; text-align: center;
      animation: snackPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .snack-started  { background: var(--color-mint); color: #fff; border-color: var(--color-ink); }
    .snack-reset    { background: var(--color-sky);  color: #fff; border-color: var(--color-ink); }
    .snack-finished { background: var(--color-coral); color: #fff; border-color: var(--color-ink); }
    @keyframes snackPop {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* ── Waiting states ── */
    .waiting-indicator {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 20px 16px;
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 16px; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .waiting-indicator p {
      font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 700;
      color: var(--color-ink); opacity: 0.7; margin: 0; text-align: center;
    }
    .wait-dots {
      display: flex; gap: 6px; align-items: center;
    }
    .wait-dots span {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--color-sky); animation: dotBounce 1.2s ease-in-out infinite;
    }
    .wait-dots span:nth-child(2) { animation-delay: 0.2s; background: var(--color-coral); }
    .wait-dots span:nth-child(3) { animation-delay: 0.4s; background: var(--color-mint); }
    @keyframes dotBounce {
      0%,80%,100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1.2); opacity: 1; }
    }
    .waiting-dots-lg span { width: 12px; height: 12px; }

    .waiting-overlay {
      position: fixed; inset: 0; z-index: 1100;
      background: var(--color-paper);
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .waiting-card {
      width: 100%; max-width: 400px;
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      text-align: center;
    }
    .waiting-icon { font-size: 72px; line-height: 1; }
    .waiting-card h2 {
      font-family: 'Fredoka One', cursive; font-size: 28px; color: var(--color-ink); margin: 0;
    }
    .waiting-card p {
      font-family: 'Nunito', sans-serif; font-size: 15px;
      color: var(--color-ink); opacity: 0.7; margin: 0;
    }
    .waiting-hunt-name {
      font-family: 'Fredoka One', cursive; font-size: 20px; color: var(--color-coral);
      background: var(--color-cream); border: 2px solid var(--color-ink);
      border-radius: 14px; padding: 10px 20px; box-shadow: 3px 3px 0 var(--color-ink);
    }
    .waiting-team-badge {
      background: var(--color-mint); color: #fff;
      border: 2px solid var(--color-ink); border-radius: 20px;
      padding: 6px 16px; font-family: 'Fredoka One', cursive; font-size: 14px;
      box-shadow: 2px 2px 0 var(--color-ink);
    }

    .stat { font-family: 'Nunito', sans-serif; font-size: 16px; margin: 0 0 8px; }
    .confetti-container { position: fixed; inset: 0; pointer-events: none; z-index: 2000; overflow: hidden; }
    .confetti-piece { position: absolute; width: 10px; height: 10px; border-radius: 2px; animation: confettiFall 1.5s ease-out forwards; }
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
  `],
})
export class PlayComponent implements OnInit, OnDestroy {
  @ViewChild('mapRef') mapRef?: MapComponent;
  @ViewChild('photoCapture')  photoCaptureRef?:  ElementRef<HTMLInputElement>;
  @ViewChild('videoCapture')  videoCaptureRef?:  ElementRef<HTMLInputElement>;
  @ViewChild('galleryPicker') galleryPickerRef?: ElementRef<HTMLInputElement>;

  readonly i18n = inject(I18nService);
  private readonly storage = inject(StorageService);
  private readonly huntService = inject(HuntService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  hunt: Hunt | null = null;
  progress: PlayerProgress | null = null;

  /** -1 means no step is currently selected on the map. */
  selectedStepIndex = -1;
  currentEnigmaIndex = 0;

  answerInput = '';
  selectedOptionIds: string[] = [];
  mediaAnswer: File | null = null;
  mediaPreviewUrl = '';
  mediaUrl = '';

  pendingSubsByEnigmaId: Map<string, AnswerSubmission> = new Map();
  sessionPendingEnigmaIds: Set<string> = new Set(); // media only — not pre-loaded from storage
  editingPendingEnigmaIds: Set<string> = new Set();
  allSubmissions: AnswerSubmission[] = [];

  earnedPoints = 0;
  pointsJustEarned = 0;
  showPointsToast = false;

  wrongAnswer = false;
  shakeAnswer = false;
  sheetExpanded = false;
  showRules = false;
  showVictory = false;
  showConfetti = false;
  showMyAnswers = false;
  showIntro = false;
  lightboxUrl = '';
  mediaError = '';
  isCompleted = false;
  completionTime = '';
  confettiItems = Array.from({ length: 50 }, (_, i) => i);

  // Team context — empty string when playing solo
  teamId = '';
  teamName = 'Joueur solo';

  waitingForStart = false;
  countdownDisplay = '';
  countdownUrgent = false;
  statusSnack = '';
  statusSnackClass = '';

  private confettiTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private statusSnackTimer?: ReturnType<typeof setTimeout>;
  private realtimeChannel?: RealtimeChannel;

  get remaining(): number {
    return (this.hunt?.steps.length ?? 0) - (this.progress?.completedStepIds.length ?? 0);
  }

  get totalPossiblePoints(): number {
    return this.hunt?.steps.reduce(
      (sum, s) => sum + s.enigmas.reduce((es, e) => es + (e.points ?? 0), 0), 0,
    ) ?? 0;
  }

  get myTeamSubmissions(): AnswerSubmission[] {
    const teamId = this.teamId || 'solo';
    return this.allSubmissions.filter(s => s.teamId === teamId);
  }

  get myApprovedScore(): number {
    return this.myTeamSubmissions
      .filter(s => s.status === 'approved')
      .reduce((sum, s) => sum + s.pointsAwarded, 0);
  }

  get leaderboard(): { teamId: string; teamName: string; points: number; isCurrentTeam: boolean }[] {
    const map = new Map<string, { teamName: string; points: number }>();
    for (const sub of this.allSubmissions) {
      if (sub.status !== 'approved') continue;
      const entry = map.get(sub.teamId);
      if (entry) {
        entry.points += sub.pointsAwarded;
      } else {
        map.set(sub.teamId, { teamName: sub.teamName, points: sub.pointsAwarded });
      }
    }
    const currentId = this.teamId || 'solo';
    return Array.from(map.entries())
      .map(([teamId, data]) => ({ teamId, ...data, isCurrentTeam: teamId === currentId }))
      .sort((a, b) => b.points - a.points);
  }

  rankMedal(index: number): string {
    return (['🥇', '🥈', '🥉'] as const)[index] ?? '';
  }

  get pendingPoints(): number {
    const teamId = this.teamId || 'solo';
    return this.allSubmissions
      .filter(s => s.teamId === teamId && s.status === 'pending')
      .reduce((sum, s) => sum + s.pointsPossible, 0);
  }

  get pendingStepIds(): string[] {
    if (!this.hunt) return [];
    return this.hunt.steps
      .filter(s => s.enigmas.some(e => this.isEnigmaPending(e.id, e.answer.type)))
      .map(s => s.id);
  }

  isEnigmaPending(enigmaId: string, type = ''): boolean {
    if (type === 'media') return this.sessionPendingEnigmaIds.has(enigmaId);
    return this.pendingSubsByEnigmaId.has(enigmaId);
  }

  getPendingTextAnswer(enigmaId: string): string {
    return this.pendingSubsByEnigmaId.get(enigmaId)?.textValue ?? '';
  }

  getPendingMediaName(enigmaId: string): string {
    return this.pendingSubsByEnigmaId.get(enigmaId)?.mediaName ?? '';
  }

  startEditPending(enigmaId: string): void {
    this.answerInput = this.getPendingTextAnswer(enigmaId);
    this.editingPendingEnigmaIds = new Set([...this.editingPendingEnigmaIds, enigmaId]);
  }

  openMediaLightbox(url: string): void {
    this.lightboxUrl = url;
    this.cdr.markForCheck();
  }

  startHunt(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.storage.setIntroSeen(code);
    this.showIntro = false;
    if (!this.storage.getRulesSeen(code)) this.showRules = true;
    this.cdr.markForCheck();
  }

  async openMyAnswers(): Promise<void> {
    await this.refreshPendingSubs();
    this.showMyAnswers = true;
    this.cdr.markForCheck();
  }

  async openLeaderboard(): Promise<void> {
    await this.refreshPendingSubs();
    this.showVictory = true;
    this.cdr.markForCheck();
  }

  private async refreshPendingSubs(): Promise<void> {
    if (!this.hunt) return;
    const teamId = this.teamId || 'solo';
    this.allSubmissions = await this.storage.getSubmissions(this.hunt.id);
    const map = new Map<string, AnswerSubmission>();
    for (const sub of this.allSubmissions) {
      if (sub.teamId !== teamId || sub.status !== 'pending') continue;
      const existing = map.get(sub.enigmaId);
      if (!existing || sub.submittedAt > existing.submittedAt) {
        map.set(sub.enigmaId, sub);
      }
    }
    this.pendingSubsByEnigmaId = map;
    // Sync earnedPoints with DB-approved score so admin validations are reflected
    this.earnedPoints = this.myApprovedScore;
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.initPlay(code);
  }

  private async initPlay(code: string): Promise<void> {
    const teamMatch = await this.storage.getTeamByCode(code);
    let hunt: Hunt | null = null;

    if (teamMatch) {
      this.teamId = teamMatch.team.id;
      this.teamName = teamMatch.team.name;
      hunt = teamMatch.hunt;
    } else {
      hunt = await this.storage.getHuntByCode(code);
    }

    if (!hunt) { this.router.navigate(['/']); return; }
    this.hunt = hunt;

    // Subscribe to real-time hunt status updates.
    // Only merge lifecycle fields — steps/name/etc. from the initial load are authoritative
    // because the Realtime payload may not include large JSONB columns like `steps`.
    this.realtimeChannel = this.storage.subscribeToHunt(hunt.id, (updated) => {
      const prevStatus   = this.hunt?.status;
      const prevDuration = this.hunt?.durationSeconds;

      this.hunt = {
        ...this.hunt!,
        status:          updated.status,
        startedAt:       updated.startedAt,
        finishedAt:      updated.finishedAt,
        published:       updated.published,
        durationSeconds: updated.durationSeconds,
      };

      if (updated.status === 'started') {
        const wasWaiting  = this.waitingForStart;
        const wasFinished = prevStatus === 'finished';
        if (this.waitingForStart) {
          this.waitingForStart = false;
          if (this.showIntro) {
            this.storage.setIntroSeen(code);
            this.showIntro = false;
            if (!this.storage.getRulesSeen(code)) this.showRules = true;
          }
        }
        // Recalculate completion from actual progress (handles timer-reset restart)
        if (this.progress) {
          this.isCompleted = this.progress.completedStepIds.length >= (this.hunt?.steps.length ?? 1);
        }
        this.startCountdown();
        if (wasWaiting) {
          this.showStatusSnack('🚀 La chasse est lancée !', 'snack-started');
        } else if (wasFinished) {
          this.showStatusSnack('🔄 La chasse a redémarré !', 'snack-reset');
        } else {
          this.showStatusSnack('🔄 Le timer a été réinitialisé !', 'snack-reset');
        }
      } else if (updated.status === 'finished') {
        this.handleHuntFinished(true);
      } else if (prevStatus === 'started' && updated.durationSeconds !== prevDuration) {
        // Duration changed while hunt already running — restart countdown silently
        this.startCountdown();
      }
      this.cdr.markForCheck();
    });

    // Set waiting state if hunt not yet started
    this.waitingForStart = hunt.status === 'ready';

    let progress = this.storage.getPlayerProgress(code);
    if (!progress) {
      progress = {
        huntCode: code,
        currentStepIndex: -1,
        completedStepIds: [],
        startedAt: new Date().toISOString(),
        hintsUsed: 0,
        earnedPoints: 0,
      };
      this.storage.savePlayerProgress(progress);
    }
    this.progress = progress;
    this.earnedPoints = progress.earnedPoints ?? 0;
    this.isCompleted = progress.completedStepIds.length >= hunt.steps.length;

    if (hunt.status === 'started') {
      this.startCountdown();
    } else if (hunt.status === 'finished') {
      this.isCompleted = true;
    }

    await this.refreshPendingSubs();
    if (!this.storage.getIntroSeen(code)) {
      this.showIntro = true;
    } else if (!this.storage.getRulesSeen(code) && !this.waitingForStart) {
      this.showRules = true;
    }
    this.cdr.markForCheck();
  }

  private startCountdown(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (!this.hunt?.durationSeconds || !this.hunt.startedAt) return;

    const tick = () => {
      if (!this.hunt?.startedAt || !this.hunt.durationSeconds) return;
      const endMs = new Date(this.hunt.startedAt).getTime() + this.hunt.durationSeconds * 1000;
      const remainMs = endMs - Date.now();
      if (remainMs <= 0) {
        this.countdownDisplay = '00:00:00';
        this.countdownUrgent = false;
        clearInterval(this.countdownInterval);
        this.handleHuntFinished();
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

  private handleHuntFinished(byAdmin = false): void {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = undefined; }
    this.countdownDisplay = '';
    if (this.hunt) this.hunt = { ...this.hunt, status: 'finished' };
    if (!this.isCompleted) {
      this.isCompleted = true;
      if (this.progress) {
        const done = { ...this.progress, completedAt: new Date().toISOString(), earnedPoints: this.earnedPoints };
        this.storage.savePlayerProgress(done);
        this.progress = done;
      }
    }
    const msg = byAdmin ? '🏁 La chasse a été arrêtée par l\'organisateur.' : '⏰ Temps écoulé ! La chasse est terminée.';
    this.showStatusSnack(msg, 'snack-finished');
    this.cdr.markForCheck();
  }

  private showStatusSnack(msg: string, cssClass: string): void {
    clearTimeout(this.statusSnackTimer);
    this.statusSnack = msg;
    this.statusSnackClass = cssClass;
    this.cdr.markForCheck();
    this.statusSnackTimer = setTimeout(() => {
      this.statusSnack = '';
      this.cdr.markForCheck();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.confettiTimer) clearTimeout(this.confettiTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.statusSnackTimer) clearTimeout(this.statusSnackTimer);
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
    this.realtimeChannel?.unsubscribe();
  }

  dismissRules(): void {
    this.showRules = false;
    if (this.hunt) {
      const code = this.route.snapshot.paramMap.get('code') ?? this.hunt.accessCode;
      this.storage.setRulesSeen(code);
    }
  }

  // ── Step selection ────────────────────────────────────────────────

  onMarkerClick(index: number): void {
    if (!this.progress) return;
    const step = this.hunt?.steps[index];
    if (!step) return;

    const isCompleted = this.progress.completedStepIds.includes(step.id);
    const hasPending = this.pendingStepIds.includes(step.id);

    // Completed steps with no pending answers are locked
    if (isCompleted && !hasPending) return;

    this.selectedStepIndex = index;
    // When re-opening a completed step, jump straight to the first pending enigma
    if (isCompleted && hasPending) {
      const firstPendingIdx = step.enigmas.findIndex(e => this.isEnigmaPending(e.id, e.answer.type));
      this.currentEnigmaIndex = Math.max(0, firstPendingIdx);
    } else {
      this.currentEnigmaIndex = 0;
    }
    this.resetAnswerState();
    this.sheetExpanded = false;
    this.mapRef?.flyToStep(index);
  }

  deselectStep(): void {
    this.selectedStepIndex = -1;
    this.currentEnigmaIndex = 0;
    this.resetAnswerState();
    this.sheetExpanded = false;
  }

  private resetAnswerState(): void {
    this.answerInput = '';
    this.selectedOptionIds = [];
    this.clearMedia();
    this.wrongAnswer = false;
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
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    try {
      assertFileSize(file);
    } catch {
      this.mediaError = `⚠️ "${file.name}" dépasse 5 Mo`;
      setTimeout(() => { this.mediaError = ''; this.cdr.markForCheck(); }, 3500);
      this.cdr.markForCheck();
      return;
    }
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
    this.mediaAnswer = file;
    this.mediaPreviewUrl = URL.createObjectURL(file);
    this.mediaUrl = '';
    this.mediaError = '';
    this.cdr.markForCheck();
  }

  clearMedia(): void {
    if (this.mediaPreviewUrl) URL.revokeObjectURL(this.mediaPreviewUrl);
    this.mediaAnswer = null;
    this.mediaPreviewUrl = '';
    this.mediaUrl = '';
  }

  // ── Submit ────────────────────────────────────────────────────────

  async submitAnswer(): Promise<void> {
    if (!this.hunt || !this.progress || this.selectedStepIndex === -1) return;
    const step = this.hunt.steps[this.selectedStepIndex];
    if (!step) return;
    const enigma = step.enigmas?.[this.currentEnigmaIndex];
    if (!enigma) return;

    if (enigma.answer.type === 'text' && !this.answerInput.trim()) return;
    if ((enigma.answer.type === 'checkbox' || enigma.answer.type === 'radio') && this.selectedOptionIds.length === 0) return;
    if (enigma.answer.type === 'media' && !this.mediaAnswer && !this.mediaUrl.trim()) return;

    // Text and media always go to pending — admin validates later
    if (enigma.answer.type === 'text' || enigma.answer.type === 'media') {
      await this.saveSubmission(step, enigma, false);
      await this.handlePending(step, enigma);
      return;
    }

    const correct = this.huntService.checkAnswer(
      this.answerInput, this.selectedOptionIds, enigma.answer, this.mediaAnswer,
    );
    await this.saveSubmission(step, enigma, correct);
    if (correct) {
      this.handleEnigmaCorrect(step);
    } else {
      this.handleWrong();
    }
    this.cdr.markForCheck();
  }

  private async saveSubmission(step: Step, enigma: Enigma, correct: boolean): Promise<void> {
    if (!this.hunt) return;

    // Text and media always require admin review
    let status: AnswerStatus;
    let pointsAwarded: number;
    if (enigma.answer.type === 'media' || enigma.answer.type === 'text') {
      status = 'pending';
      pointsAwarded = 0;
    } else if (correct) {
      status = 'approved';
      pointsAwarded = enigma.points ?? 0;
    } else {
      status = 'rejected';
      pointsAwarded = 0;
    }

    // Reuse existing pending ID so re-submissions overwrite rather than duplicate
    const existingPending = this.pendingSubsByEnigmaId.get(enigma.id);
    const id = (status === 'pending' && existingPending)
      ? existingPending.id
      : `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const submission: AnswerSubmission = {
      id,
      huntId: this.hunt.id,
      stepId: step.id,
      enigmaId: enigma.id,
      teamId: this.teamId || 'solo',
      teamName: this.teamName || 'Joueur solo',
      stepTitle: step.title,
      enigmaTitle: enigma.title,
      type: enigma.answer.type,
      textValue: enigma.answer.type === 'text' ? this.answerInput : '',
      selectedOptionIds: enigma.answer.type === 'checkbox' || enigma.answer.type === 'radio'
        ? [...this.selectedOptionIds]
        : [],
      mediaName: enigma.answer.type === 'media'
        ? (this.mediaAnswer ? this.mediaAnswer.name : this.mediaUrl.trim())
        : '',
      submittedAt: new Date().toISOString(),
      status,
      pointsAwarded,
      pointsPossible: enigma.points ?? 0,
      reviewedAt: status !== 'pending' ? new Date().toISOString() : undefined,
    };

    await this.storage.saveSubmission(submission);
  }

  private handleEnigmaCorrect(step: Step): void {
    const enigma = step.enigmas[this.currentEnigmaIndex];
    const pts = enigma?.points ?? 0;
    if (pts > 0) {
      this.earnedPoints += pts;
      this.pointsJustEarned = pts;
      this.showPointsToast = true;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { this.showPointsToast = false; this.cdr.markForCheck(); }, 1800);
    }

    this.resetAnswerState();
    this.triggerConfetti();

    if (this.currentEnigmaIndex < step.enigmas.length - 1) {
      this.currentEnigmaIndex++;
    } else {
      this.markStepComplete(step);
    }
  }

  private markStepComplete(step: Step): void {
    if (!this.hunt || !this.progress) return;

    const newCompleted = [...this.progress.completedStepIds, step.id];
    this.progress = { ...this.progress, completedStepIds: newCompleted, earnedPoints: this.earnedPoints };
    this.storage.savePlayerProgress(this.progress);

    this.selectedStepIndex = -1;
    this.currentEnigmaIndex = 0;

    if (newCompleted.length >= this.hunt.steps.length) {
      const done = { ...this.progress, completedAt: new Date().toISOString(), earnedPoints: this.earnedPoints };
      this.storage.savePlayerProgress(done);
      this.progress = done;
      this.isCompleted = true;
      const ms = new Date(done.completedAt!).getTime() - new Date(done.startedAt).getTime();
      this.completionTime = this.i18n.formatDuration(ms);
      setTimeout(() => { this.showVictory = true; this.cdr.markForCheck(); }, 2000);
    }
  }

  private handleWrong(): void {
    this.wrongAnswer = true;
    this.shakeAnswer = true;
    setTimeout(() => { this.shakeAnswer = false; this.cdr.markForCheck(); }, 500);
  }

  private async handlePending(step: Step, enigma: Enigma): Promise<void> {
    if (enigma.answer.type === 'media') {
      this.sessionPendingEnigmaIds = new Set([...this.sessionPendingEnigmaIds, enigma.id]);
    }
    this.editingPendingEnigmaIds.delete(enigma.id);
    this.resetAnswerState();
    await this.refreshPendingSubs();

    if (this.currentEnigmaIndex < step.enigmas.length - 1) {
      this.currentEnigmaIndex++;
    } else {
      this.markStepComplete(step);
    }
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.confettiTimer = setTimeout(() => { this.showConfetti = false; this.cdr.markForCheck(); }, 1800);
  }

  confettiStyle(i: number): string {
    const colors = ['#FF6B6B', '#FFE66D', '#6BCB77', '#4ECDC4'];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const dur = 1.2 + Math.random() * 0.6;
    return `left:${left}%;top:-20px;background:${colors[i % colors.length]};animation-delay:${delay}s;animation-duration:${dur}s`;
  }
}
