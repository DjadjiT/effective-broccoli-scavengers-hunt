import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../lib/markdown.pipe';

@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  template: `
    <div class="md-editor">
      <div class="md-tabs">
        <button class="md-tab" [class.active]="!preview" type="button"
          (click)="preview = false">✏️ Édition</button>
        <button class="md-tab" [class.active]="preview" type="button"
          (click)="preview = true">👁 Aperçu</button>
      </div>

      @if (!preview) {
        <textarea class="md-textarea"
          [value]="value"
          (input)="onInput($event)"
          [rows]="rows"
          [placeholder]="placeholder"></textarea>
        <p class="md-hint">Markdown supporté : **gras**, *italique*, # titre, - liste, [lien](url)</p>
      } @else {
        <div class="md-preview" [innerHTML]="value | md"></div>
      }
    </div>
  `,
  styles: [`
    .md-editor { display: flex; flex-direction: column; gap: 0; }
    .md-tabs {
      display: flex; gap: 0; margin-bottom: -2px; position: relative; z-index: 1;
    }
    .md-tab {
      padding: 6px 14px;
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px;
      border: 2px solid var(--color-ink); border-bottom: none;
      border-radius: 10px 10px 0 0;
      background: var(--color-cream); color: var(--color-ink);
      cursor: pointer; opacity: 0.55; transition: opacity 0.12s, background 0.12s;
    }
    .md-tab.active { background: var(--color-paper); opacity: 1; }
    .md-tab:first-child { margin-right: 4px; }
    .md-textarea {
      font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px;
      padding: 10px 14px; border: 2px solid var(--color-ink); border-radius: 0 12px 12px 12px;
      background: var(--color-paper); color: var(--color-ink);
      resize: vertical; outline: none; width: 100%; box-sizing: border-box; line-height: 1.6;
    }
    .md-textarea:focus { border-color: var(--color-sky); box-shadow: 3px 3px 0 var(--color-sky); }
    .md-hint {
      font-family: 'Nunito', sans-serif; font-size: 11px;
      color: var(--color-ink); opacity: 0.45; margin: 4px 0 0;
    }
    .md-preview {
      min-height: 60px; padding: 10px 14px;
      border: 2px solid var(--color-ink); border-radius: 0 12px 12px 12px;
      background: var(--color-paper); font-family: 'Nunito', sans-serif;
      font-size: 14px; line-height: 1.7; color: var(--color-ink);
    }
    .md-preview :global(h1), .md-preview :global(h2), .md-preview :global(h3) {
      font-family: 'Fredoka One', cursive; margin: 0.5em 0 0.25em;
    }
    .md-preview :global(p)  { margin: 0 0 0.6em; }
    .md-preview :global(ul), .md-preview :global(ol) { padding-left: 20px; margin: 0 0 0.6em; }
    .md-preview :global(a)  { color: var(--color-sky); }
    .md-preview :global(strong) { font-weight: 800; }
    .md-preview :global(code) { font-family: monospace; background: var(--color-cream); padding: 1px 4px; border-radius: 4px; }
    .md-preview :global(blockquote) {
      border-left: 3px solid var(--color-coral); margin: 0; padding: 4px 12px;
      background: var(--color-cream); border-radius: 0 8px 8px 0;
    }
    .md-preview ::ng-deep img, .md-preview ::ng-deep video {
      width: 100%; height: auto; display: block; border-radius: 8px;
    }
  `],
})
export class MarkdownEditorComponent {
  @Input() value = '';
  @Input() rows = 4;
  @Input() placeholder = 'Écrivez en Markdown…';
  @Output() valueChange = new EventEmitter<string>();

  preview = false;

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLTextAreaElement).value);
  }
}
