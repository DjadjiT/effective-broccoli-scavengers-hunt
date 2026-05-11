import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="lang-toggle" (click)="i18n.toggle()" [title]="i18n.currentLang() === 'fr' ? 'Switch to English' : 'Passer en Français'">
      <span [class.active]="i18n.currentLang() === 'fr'">FR</span>
      <span class="sep">|</span>
      <span [class.active]="i18n.currentLang() === 'en'">EN</span>
    </button>
  `,
  styles: [`
    .lang-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--color-paper);
      border: 2px solid var(--color-ink);
      border-radius: 20px;
      padding: 4px 12px;
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 3px 3px 0 var(--color-ink);
      transition: transform 0.1s, box-shadow 0.1s;
      color: var(--color-ink);
    }
    .lang-toggle:hover {
      transform: translate(-1px, -1px);
      box-shadow: 4px 4px 0 var(--color-ink);
    }
    .lang-toggle:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0 var(--color-ink);
    }
    .sep { opacity: 0.3; }
    span.active { color: var(--color-coral); }
  `],
})
export class LanguageToggleComponent {
  constructor(public i18n: I18nService) {}
}
