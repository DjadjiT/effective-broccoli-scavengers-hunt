import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-wrap">
      <span class="step-label">{{ i18n.stepOf(current, total) }}</span>
      <div class="bar-track">
        <div class="bar-fill" [style.width.%]="percent"></div>
      </div>
      <span class="percent-label">{{ percent }}%</span>
    </div>
  `,
  styles: [`
    .progress-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .step-label {
      font-family: 'Nunito', sans-serif;
      font-weight: 700;
      font-size: 13px;
      white-space: nowrap;
      color: var(--color-ink);
    }
    .bar-track {
      flex: 1;
      height: 12px;
      background: var(--color-cream);
      border: 2px solid var(--color-ink);
      border-radius: 6px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--color-mint);
      border-radius: 4px;
      transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .percent-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-ink);
      opacity: 0.6;
      min-width: 36px;
    }
  `],
})
export class ProgressBarComponent {
  @Input() current = 1;
  @Input() total = 1;

  get percent(): number {
    return Math.round((this.current / this.total) * 100);
  }

  constructor(public i18n: I18nService) {}
}
