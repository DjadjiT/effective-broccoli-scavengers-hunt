import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dash-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="dash-nav">
      <a routerLink="/dashboard" class="logo">🗺️ ScavengerHunt</a>

      <div class="right">
        @if (auth.isAuthenticated()) {
          <span class="user-name" [title]="auth.currentUserName()">
            👤 {{ auth.currentUserName() }}
          </span>
          <button type="button" class="btn-logout" (click)="logout()">
            Déconnexion
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .dash-nav {
      position: sticky;
      top: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 24px;
      background: var(--color-paper);
      border-bottom: 3px solid var(--color-ink);
    }
    .logo {
      font-family: 'Fredoka One', cursive;
      font-size: 22px;
      color: var(--color-ink);
      text-decoration: none;
    }
    .right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-name {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--color-ink);
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .btn-logout {
      background: var(--color-coral);
      color: #fff;
      border: 2px solid var(--color-ink);
      border-radius: 12px;
      padding: 8px 14px;
      font-family: 'Fredoka One', cursive;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .btn-logout:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--color-ink);
    }
    .btn-logout:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 var(--color-ink);
    }
    @media (max-width: 480px) {
      .dash-nav { padding: 12px 16px; }
      .logo { font-size: 18px; }
      .user-name { max-width: 90px; font-size: 12px; }
      .btn-logout { padding: 6px 10px; font-size: 12px; }
    }
  `],
})
export class DashNavComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }
}
