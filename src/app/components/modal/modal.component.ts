import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="backdrop" (click)="onBackdropClick($event)">
        <div class="modal-box" role="dialog" [attr.aria-modal]="true">
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(45, 45, 45, 0.55);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: fadeIn 0.2s ease;
    }
    .modal-box {
      background: var(--color-paper);
      border: 3px solid var(--color-ink);
      border-radius: 24px;
      box-shadow: 8px 8px 0 var(--color-ink);
      padding: 32px;
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes popIn {
      from { transform: scale(0.85); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `],
})
export class ModalComponent {
  @Input() visible = false;
  @Input() closeOnBackdrop = true;
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop && event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
