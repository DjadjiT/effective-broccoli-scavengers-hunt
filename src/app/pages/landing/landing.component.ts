import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LanguageToggleComponent],
  template: `
    <div class="page">
      <!-- ── Top Nav ── -->
      <header class="top-nav">
        <a routerLink="/" class="logo">🗺️ ScavengerHunt</a>
        <div class="nav-right">
          <app-language-toggle></app-language-toggle>
          @if (auth.isAuthenticated()) {
            <a routerLink="/dashboard" class="btn-nav-primary">Tableau de bord</a>
          } @else {
            <a routerLink="/login" class="btn-nav-secondary">Se connecter</a>
            <a routerLink="/register" class="btn-nav-primary">S'inscrire</a>
          }
        </div>
      </header>

      <!-- ── Hero ── -->
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-emoji">🗺️</div>
          <h1 class="hero-title">
            Créez des chasses au trésor
            <span class="hero-accent">mémorables</span>
          </h1>
          <p class="hero-subtitle">
            Concevez votre parcours en quelques clics, partagez un code, et
            laissez l'aventure commencer.
          </p>

          <div class="hero-ctas">
            @if (auth.isAuthenticated()) {
              <a routerLink="/dashboard" class="btn-primary">
                🚀 Mon tableau de bord
              </a>
            } @else {
              <a routerLink="/register" class="btn-primary">
                S'inscrire gratuitement
              </a>
              <a routerLink="/login" class="btn-secondary">
                Se connecter
              </a>
            }
          </div>

          <!-- Player code section -->
          <div class="code-section">
            <p class="code-label">Vous avez un code ?  →</p>
            <div class="code-form" [class.shake]="shakeInput">
              <input
                #codeInput
                type="text"
                class="code-input"
                [placeholder]="i18n.t('enterCode')"
                [(ngModel)]="code"
                (ngModelChange)="onCodeChange($event)"
                (keydown.enter)="onSubmit()"
                maxlength="6"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
              />
              <button type="button" class="btn-play" (click)="onSubmit()">
                Jouer
              </button>
            </div>
            @if (errorMsg) {
              <p class="error-msg">⚠️ {{ errorMsg }}</p>
            }
          </div>
        </div>
      </section>

      <!-- ── Features ── -->
      <section class="features">
        <h2 class="section-title">Tout ce qu'il vous faut</h2>
        <div class="features-grid">
          <div class="feature-card feature-coral">
            <div class="feature-icon">🏗️</div>
            <h3>Créez vos parcours</h3>
            <p>
              Étapes, énigmes, médias, points… Construisez la chasse parfaite
              avec un éditeur visuel et une carte interactive.
            </p>
          </div>
          <div class="feature-card feature-mint">
            <div class="feature-icon">📱</div>
            <h3>Partagez en un code</h3>
            <p>
              Distribuez un code à 6 caractères. Vos joueurs n'ont rien à
              installer : ça marche sur tous les téléphones.
            </p>
          </div>
          <div class="feature-card feature-sky">
            <div class="feature-icon">📊</div>
            <h3>Suivez en direct</h3>
            <p>
              Modérez les réponses photo, attribuez les points, et gardez un
              œil sur la progression de chaque équipe.
            </p>
          </div>
        </div>
      </section>

      <!-- ── How it works ── -->
      <section class="how">
        <h2 class="section-title">Comment ça marche</h2>
        <div class="how-steps">
          <div class="how-step">
            <div class="step-num">1</div>
            <h3>Créez un compte</h3>
            <p>Inscrivez-vous gratuitement en quelques secondes.</p>
          </div>
          <div class="how-arrow">→</div>
          <div class="how-step">
            <div class="step-num">2</div>
            <h3>Construisez votre chasse</h3>
            <p>Placez vos étapes sur la carte, ajoutez vos énigmes.</p>
          </div>
          <div class="how-arrow">→</div>
          <div class="how-step">
            <div class="step-num">3</div>
            <h3>Partagez et jouez</h3>
            <p>Donnez le code à vos équipes et c'est parti !</p>
          </div>
        </div>
      </section>

      <!-- ── Final CTA ── -->
      <section class="final-cta">
        <h2>Prêt à démarrer ?</h2>
        <p>Rejoignez les organisateurs qui créent déjà avec ScavengerHunt.</p>
        @if (auth.isAuthenticated()) {
          <a routerLink="/dashboard" class="btn-primary big">
            Aller au tableau de bord
          </a>
        } @else {
          <a routerLink="/register" class="btn-primary big">
            Créer mon compte gratuit
          </a>
        }
      </section>

      <!-- ── Footer ── -->
      <footer class="footer">
        <p>© {{ year }} ScavengerHunt · Conçu avec 🧡</p>
      </footer>

      @if (showDemoBadge) {
        <div class="demo-badge" (click)="tryDemo()">
          🎮 Essayez PARIS1
          <button type="button" class="badge-close" (click)="dismissDemo($event)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--color-cream);
      background-image: var(--dot-grid);
    }

    /* ── Top Nav ── */
    .top-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 24px;
      background: var(--color-paper);
      border-bottom: 3px solid var(--color-ink);
    }
    .logo {
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      color: var(--color-ink);
      text-decoration: none;
    }
    .nav-right { display: flex; align-items: center; gap: 10px; }
    .btn-nav-primary, .btn-nav-secondary {
      font-family: 'Fredoka One', cursive;
      font-size: 14px;
      padding: 8px 16px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      white-space: nowrap;
    }
    .btn-nav-primary { background: var(--color-coral); color: #fff; }
    .btn-nav-secondary { background: var(--color-paper); color: var(--color-ink); }
    .btn-nav-primary:hover, .btn-nav-secondary:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--color-ink);
    }
    @media (max-width: 480px) {
      .top-nav { padding: 12px 14px; }
      .logo { font-size: 17px; }
      .btn-nav-primary, .btn-nav-secondary { padding: 6px 10px; font-size: 12px; }
    }

    /* ── Hero ── */
    .hero {
      padding: 60px 20px 40px;
      display: flex;
      justify-content: center;
    }
    .hero-inner {
      max-width: 700px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 24px;
      animation: fadeInUp 0.6s ease both;
    }
    .hero-emoji {
      font-size: 72px;
      line-height: 1;
      animation: heroFloat 3s ease-in-out infinite;
      filter: drop-shadow(0 8px 16px rgba(45,45,45,0.15));
    }
    @keyframes heroFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .hero-title {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(30px, 6vw, 52px);
      line-height: 1.15;
      color: var(--color-ink);
      margin: 0;
    }
    .hero-accent {
      color: var(--color-coral);
      display: inline-block;
    }
    .hero-subtitle {
      font-family: 'Nunito', sans-serif;
      font-size: 17px;
      line-height: 1.5;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
      max-width: 520px;
    }
    .hero-ctas {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .btn-primary, .btn-secondary {
      font-family: 'Fredoka One', cursive;
      font-size: 18px;
      padding: 14px 28px;
      border: 3px solid var(--color-ink);
      border-radius: 16px;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 5px 5px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      white-space: nowrap;
      display: inline-block;
    }
    .btn-primary { background: var(--color-coral); color: #fff; }
    .btn-secondary { background: var(--color-paper); color: var(--color-ink); }
    .btn-primary:hover, .btn-secondary:hover {
      transform: translate(-2px, -2px);
      box-shadow: 7px 7px 0 var(--color-ink);
    }
    .btn-primary:active, .btn-secondary:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .btn-primary.big { font-size: 22px; padding: 18px 36px; }

    /* ── Code section ── */
    .code-section {
      width: 100%;
      max-width: 420px;
      margin-top: 12px;
      padding: 20px;
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
    }
    .code-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 14px;
      color: var(--color-ink);
      margin: 0 0 12px;
      text-align: left;
    }
    .code-form {
      display: flex;
      gap: 8px;
    }
    .code-form.shake { animation: shake 0.4s ease; }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
    .code-input {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 22px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 4px;
      padding: 12px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      background: var(--color-cream);
      color: var(--color-ink);
      outline: none;
      box-sizing: border-box;
      transition: box-shadow 0.1s;
    }
    .code-input:focus {
      border-color: var(--color-sky);
      box-shadow: 3px 3px 0 var(--color-sky);
    }
    .btn-play {
      font-family: 'Fredoka One', cursive;
      font-size: 15px;
      padding: 0 18px;
      background: var(--color-sky);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      box-shadow: 3px 3px 0 var(--color-ink);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      white-space: nowrap;
    }
    .btn-play:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--color-ink); }
    .btn-play:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--color-ink); }
    .error-msg {
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      color: var(--color-coral);
      font-weight: 800;
      margin: 10px 0 0;
      text-align: left;
    }

    /* ── Features ── */
    .features {
      padding: 60px 20px;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .section-title {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(26px, 4vw, 38px);
      color: var(--color-ink);
      text-align: center;
      margin: 0 0 36px;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }
    .feature-card {
      padding: 28px 24px;
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 6px 6px 0 var(--color-ink);
      background: var(--color-paper);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .feature-card:hover {
      transform: translate(-2px, -2px);
      box-shadow: 8px 8px 0 var(--color-ink);
    }
    .feature-coral { background: #FFE3E3; }
    .feature-mint  { background: #E3F8E6; }
    .feature-sky   { background: #DDF6F5; }
    .feature-icon {
      font-size: 44px;
      margin-bottom: 12px;
      line-height: 1;
    }
    .feature-card h3 {
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      color: var(--color-ink);
      margin: 0 0 10px;
    }
    .feature-card p {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      line-height: 1.55;
      color: var(--color-ink);
      opacity: 0.8;
      margin: 0;
    }

    /* ── How it works ── */
    .how {
      padding: 40px 20px 60px;
      max-width: 1100px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }
    .how-steps {
      display: flex;
      gap: 16px;
      align-items: stretch;
      flex-wrap: wrap;
      justify-content: center;
    }
    .how-step {
      flex: 1 1 240px;
      max-width: 280px;
      padding: 24px 20px;
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 5px 5px 0 var(--color-ink);
      text-align: center;
    }
    .step-num {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      background: var(--color-lemon);
      border: 3px solid var(--color-ink);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      color: var(--color-ink);
      box-shadow: 3px 3px 0 var(--color-ink);
    }
    .how-step h3 {
      font-family: 'Fredoka One', cursive;
      font-size: 18px;
      margin: 0 0 8px;
      color: var(--color-ink);
    }
    .how-step p {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      opacity: 0.75;
    }
    .how-arrow {
      align-self: center;
      font-family: 'Fredoka One', cursive;
      font-size: 32px;
      color: var(--color-coral);
    }
    @media (max-width: 768px) {
      .how-arrow { display: none; }
    }

    /* ── Final CTA ── */
    .final-cta {
      padding: 60px 20px;
      margin: 0 auto;
      max-width: 800px;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .final-cta h2 {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(26px, 4vw, 38px);
      color: var(--color-ink);
      margin: 0;
    }
    .final-cta p {
      font-family: 'Nunito', sans-serif;
      font-size: 16px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0 0 8px;
    }

    /* ── Footer ── */
    .footer {
      padding: 24px 20px;
      text-align: center;
      border-top: 2px solid rgba(45,45,45,0.1);
      font-family: 'Nunito', sans-serif;
      font-size: 13px;
      color: var(--color-ink);
      opacity: 0.55;
    }
    .footer p { margin: 0; }

    /* ── Demo badge ── */
    .demo-badge {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-lemon);
      border: 3px solid var(--color-ink);
      border-radius: 30px;
      padding: 10px 20px;
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 15px;
      color: var(--color-ink);
      box-shadow: 4px 4px 0 var(--color-ink);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideUp 0.4s 2s ease both;
      white-space: nowrap;
      z-index: 50;
    }
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(80px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    .badge-close {
      background: none;
      border: none;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: var(--color-ink);
      padding: 0;
      opacity: 0.6;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class LandingComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  code = '';
  errorMsg = '';
  shakeInput = false;
  showDemoBadge = false;
  readonly year = new Date().getFullYear();

  ngOnInit(): void {
    setTimeout(() => { this.showDemoBadge = true; }, 2000);
  }

  onCodeChange(value: string): void {
    this.code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.errorMsg = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.code.trim()) {
      this.errorMsg = this.i18n.t('emptyCode');
      this.triggerShake();
      return;
    }
    const teamMatch = await this.storage.getTeamByCode(this.code);
    if (!teamMatch) {
      this.errorMsg = this.i18n.t('invalidCode');
      this.code = '';
      this.triggerShake();
      return;
    }
    this.router.navigate(['/play', this.code]);
  }

  tryDemo(): void {
    this.code = 'PARIS1';
    this.onSubmit();
  }

  dismissDemo(event: Event): void {
    event.stopPropagation();
    this.showDemoBadge = false;
  }

  private triggerShake(): void {
    this.shakeInput = true;
    setTimeout(() => { this.shakeInput = false; }, 500);
  }
}
