import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <a routerLink="/" class="home-link">← Retour à l'accueil</a>

      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-emoji">✨</div>
          <h1>Créer un compte</h1>
          <p>Commencez à créer vos chasses au trésor en quelques secondes.</p>
        </div>

        <form class="auth-form" (ngSubmit)="onSubmit()" novalidate>
          <div class="field">
            <label for="name">Nom complet</label>
            <input
              id="name"
              type="text"
              class="field-input"
              [(ngModel)]="name"
              name="name"
              placeholder="Marie Dupont"
              autocomplete="name"
              required
            />
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              class="field-input"
              [(ngModel)]="email"
              name="email"
              placeholder="vous@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              class="field-input"
              [(ngModel)]="password"
              name="password"
              placeholder="6 caractères minimum"
              autocomplete="new-password"
              required
            />
          </div>

          @if (errorMsg) {
            <div class="error-box">⚠️ {{ errorMsg }}</div>
          }

          <button type="submit" class="btn-submit" [disabled]="loading">
            {{ loading ? 'Création…' : "S'inscrire" }}
          </button>
        </form>

        <p class="alt-link">
          Déjà un compte ?
          <a routerLink="/login">Se connecter</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .auth-page {
      min-height: 100vh;
      background: var(--color-cream);
      background-image: var(--dot-grid);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 16px 40px;
      box-sizing: border-box;
    }
    .home-link {
      align-self: flex-start;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--color-ink);
      text-decoration: none;
      padding: 8px 12px;
      opacity: 0.7;
    }
    .home-link:hover { opacity: 1; }

    .auth-card {
      width: 100%;
      max-width: 420px;
      margin-top: 24px;
      padding: 32px 24px;
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 24px;
      box-shadow: 7px 7px 0 var(--color-ink);
      animation: fadeInUp 0.4s ease both;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .auth-header { text-align: center; margin-bottom: 24px; }
    .auth-emoji { font-size: 56px; line-height: 1; margin-bottom: 8px; }
    .auth-header h1 {
      font-family: 'Fredoka One', cursive;
      font-size: 28px;
      color: var(--color-ink);
      margin: 0 0 6px;
    }
    .auth-header p {
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      color: var(--color-ink);
      opacity: 0.7;
      margin: 0;
    }

    .auth-form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label {
      font-family: 'Nunito', sans-serif;
      font-weight: 800;
      font-size: 12px;
      color: var(--color-ink);
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-input {
      font-family: 'Nunito', sans-serif;
      font-size: 15px;
      padding: 12px 14px;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      background: var(--color-cream);
      color: var(--color-ink);
      outline: none;
      transition: box-shadow 0.14s, border-color 0.14s;
      box-sizing: border-box;
    }
    .field-input:focus {
      border-color: var(--color-sky);
      box-shadow: 3px 3px 0 var(--color-sky);
    }

    @keyframes errorAppear {
      0%   { opacity: 0; transform: translateY(-6px) scale(0.97); }
      60%  { transform: translateY(2px) scale(1.01); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-7px); }
      40%       { transform: translateX(7px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
    .error-box {
      background: #FFE3E3;
      border: 2px solid var(--color-coral);
      border-radius: 12px;
      padding: 10px 14px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
      color: var(--color-ink);
      animation: errorAppear 0.25s ease forwards, shake 0.4s ease 0.15s;
    }

    .btn-submit {
      margin-top: 6px;
      font-family: 'Fredoka One', cursive;
      font-size: 18px;
      padding: 14px 20px;
      background: var(--color-mint);
      color: #fff;
      border: 3px solid var(--color-ink);
      border-radius: 16px;
      box-shadow: 5px 5px 0 var(--color-ink);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn-submit:hover:not(:disabled) {
      transform: translate(-2px, -2px);
      box-shadow: 7px 7px 0 var(--color-ink);
    }
    .btn-submit:active:not(:disabled) {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--color-ink);
    }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .alt-link {
      text-align: center;
      margin: 18px 0 0;
      font-family: 'Nunito', sans-serif;
      font-size: 14px;
      color: var(--color-ink);
      opacity: 0.8;
    }
    .alt-link a {
      color: var(--color-sky);
      font-weight: 800;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      transition: border-color 0.18s;
    }
    .alt-link a:hover { border-color: var(--color-sky); }
  `],
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  errorMsg = '';
  loading = false;

  async onSubmit(): Promise<void> {
    this.errorMsg = '';
    this.loading = true;
    const result = await this.auth.register(this.name, this.email, this.password);
    this.loading = false;

    if (!result.ok) {
      this.errorMsg = result.error;
      return;
    }
    this.router.navigate(['/dashboard']);
  }
}
