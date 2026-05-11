import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { StorageService } from '../../services/storage.service';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LanguageToggleComponent],
  template: `
    <div class="page">
      <header class="header">
        <div class="logo">🗺️ ScavengerHunt</div>
        <app-language-toggle></app-language-toggle>
      </header>

      <main class="hero">
        <div class="hero-emoji" [class.bounce]="true">🗺️</div>

        <h1 class="title">
          <span class="title-fr">Trouve le trésor</span>
          <span class="title-sep">/</span>
          <span class="title-en">Find the Treasure</span>
        </h1>

        <p class="tagline">{{ i18n.t('tagline') }}</p>

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
          @if (errorMsg) {
            <p class="error-msg">⚠️ {{ errorMsg }}</p>
          }
          <button class="btn-cta" (click)="onSubmit()">
            {{ i18n.t('letsGo') }}
          </button>
        </div>

        <a class="create-link" routerLink="/admin">
          🏗️ {{ i18n.t('createHunt') }}
        </a>
      </main>

      @if (showDemoBadge) {
        <div class="demo-badge" (click)="tryDemo()">
          🎮 {{ i18n.t('tryDemo') }}
          <button class="badge-close" (click)="dismissDemo($event)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--color-cream);
      background-image: var(--dot-grid);
      padding: 0 16px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
    }
    .logo {
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      color: var(--color-ink);
    }
    .hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 24px;
      padding: 40px 0;
      animation: fadeInUp 0.5s ease both;
    }
    .hero-emoji {
      font-size: 80px;
      line-height: 1;
      animation: heroFloat 3s ease-in-out infinite;
      filter: drop-shadow(0 8px 16px rgba(45,45,45,0.15));
    }
    @keyframes heroFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }
    .title {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(28px, 6vw, 48px);
      color: var(--color-ink);
      line-height: 1.2;
      margin: 0;
    }
    .title-sep {
      margin: 0 12px;
      color: var(--color-coral);
    }
    .tagline {
      font-family: 'Nunito', sans-serif;
      font-size: 16px;
      color: var(--color-ink);
      opacity: 0.65;
      margin: 0;
    }
    .code-form {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .code-form.shake {
      animation: shake 0.4s ease;
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-6px); }
      80% { transform: translateX(6px); }
    }
    .code-input {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 28px;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 6px;
      padding: 18px 20px;
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      background: var(--color-paper);
      box-shadow: 5px 5px 0 var(--color-ink);
      outline: none;
      color: var(--color-ink);
      box-sizing: border-box;
      transition: box-shadow 0.1s, transform 0.1s;
    }
    .code-input:focus {
      border-color: var(--color-sky);
      box-shadow: 5px 5px 0 var(--color-sky);
    }
    .error-msg {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      color: var(--color-coral);
      margin: 0;
      text-align: center;
      font-weight: 700;
    }
    .btn-cta {
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      padding: 16px 32px;
      background: var(--color-coral);
      color: #fff;
      border: 3px solid var(--color-ink);
      border-radius: 20px;
      box-shadow: 5px 5px 0 var(--color-ink);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      width: 100%;
    }
    .btn-cta:hover { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 var(--color-ink); }
    .btn-cta:active { transform: translate(3px, 3px); box-shadow: 2px 2px 0 var(--color-ink); }
    .create-link {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 15px;
      color: var(--color-sky);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: border-color 0.2s;
    }
    .create-link:hover { border-color: var(--color-sky); }
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
  code = '';
  errorMsg = '';
  shakeInput = false;
  showDemoBadge = false;

  constructor(
    public i18n: I18nService,
    private storage: StorageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    setTimeout(() => { this.showDemoBadge = true; }, 2000);
  }

  onCodeChange(value: string): void {
    this.code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.errorMsg = '';
  }

  onSubmit(): void {
    if (!this.code.trim()) {
      this.errorMsg = this.i18n.t('emptyCode');
      this.triggerShake();
      return;
    }
    const hunt = this.storage.getHuntByCode(this.code);
    if (!hunt) {
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
