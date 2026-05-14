import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  inject,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';

// ── Future extensions (uncomment to enable) ───────────────────────────────────
// import Image from '@tiptap/extension-image';
// import Mention from '@tiptap/extension-mention';
// import Table from '@tiptap/extension-table';
// import TableRow from '@tiptap/extension-table-row';
// import TableCell from '@tiptap/extension-table-cell';
// import TableHeader from '@tiptap/extension-table-header';

const EMOJIS = [
  '😀','😄','😂','🤣','😍','🤔','😢','😡','🥳','😎','🤩','😴',
  '👍','👎','👋','🙌','🤝','💪','👏','✌️','☝️','👆','❤️','💛',
  '⭐','🔥','✅','❌','⚠️','💡','🎯','🏆','🗺️','📍','🔑','🎉',
  '🎊','🎁','🚀','💎','🌟','🌈','☀️','🌙','⚡','🎵','📷','🏅',
];

/** Returns HTML from either an existing HTML string or a legacy Markdown string. */
function toHtml(value: string): string {
  if (!value?.trim()) return '';
  if (value.trimStart().startsWith('<')) return value;
  return marked.parse(value, { async: false }) as string;
}

@Component({
  selector: 'app-rich-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="re-wrap" (click)="$event.stopPropagation()">

      <!-- ── Toolbar ── -->
      <div class="re-toolbar" role="toolbar" aria-label="Barre d'outils">

        <div class="re-group">
          <button class="re-btn" type="button" title="Titre 1"
            [class.is-active]="active('heading',{level:1})"
            (mousedown)="$event.preventDefault(); cmd('toggleHeading',{level:1})">H1</button>
          <button class="re-btn" type="button" title="Titre 2"
            [class.is-active]="active('heading',{level:2})"
            (mousedown)="$event.preventDefault(); cmd('toggleHeading',{level:2})">H2</button>
          <button class="re-btn" type="button" title="Titre 3"
            [class.is-active]="active('heading',{level:3})"
            (mousedown)="$event.preventDefault(); cmd('toggleHeading',{level:3})">H3</button>
        </div>

        <span class="re-sep"></span>

        <div class="re-group">
          <button class="re-btn re-b" type="button" title="Gras"
            [class.is-active]="active('bold')"
            (mousedown)="$event.preventDefault(); cmd('toggleBold')">B</button>
          <button class="re-btn re-i" type="button" title="Italique"
            [class.is-active]="active('italic')"
            (mousedown)="$event.preventDefault(); cmd('toggleItalic')">I</button>
          <button class="re-btn re-u" type="button" title="Souligné"
            [class.is-active]="active('underline')"
            (mousedown)="$event.preventDefault(); cmd('toggleUnderline')">U</button>
          <button class="re-btn re-s" type="button" title="Barré"
            [class.is-active]="active('strike')"
            (mousedown)="$event.preventDefault(); cmd('toggleStrike')">S</button>
          <button class="re-btn re-mark" type="button" title="Surlignage"
            [class.is-active]="active('highlight')"
            (mousedown)="$event.preventDefault(); cmd('toggleHighlight')">A</button>
        </div>

        <span class="re-sep"></span>

        <div class="re-group">
          <button class="re-btn" type="button" title="Liste à puces"
            [class.is-active]="active('bulletList')"
            (mousedown)="$event.preventDefault(); cmd('toggleBulletList')">•</button>
          <button class="re-btn" type="button" title="Liste numérotée"
            [class.is-active]="active('orderedList')"
            (mousedown)="$event.preventDefault(); cmd('toggleOrderedList')">1.</button>
          <button class="re-btn" type="button" title="Liste de tâches"
            [class.is-active]="active('taskList')"
            (mousedown)="$event.preventDefault(); cmd('toggleTaskList')">☑</button>
        </div>

        <span class="re-sep"></span>

        <div class="re-group">
          <button class="re-btn" type="button" title="Citation"
            [class.is-active]="active('blockquote')"
            (mousedown)="$event.preventDefault(); cmd('toggleBlockquote')">❝</button>
          <button class="re-btn re-code" type="button" title="Bloc de code"
            [class.is-active]="active('codeBlock')"
            (mousedown)="$event.preventDefault(); cmd('toggleCodeBlock')">&lt;/&gt;</button>
          <button class="re-btn" type="button" title="Séparateur"
            (mousedown)="$event.preventDefault(); cmd('setHorizontalRule')">─</button>
        </div>

        <span class="re-sep"></span>

        <div class="re-group">
          <button class="re-btn" type="button" title="Lien"
            [class.is-active]="active('link') || showLink"
            (mousedown)="$event.preventDefault(); openLink()">🔗</button>
          <button class="re-btn" type="button" title="Émoji"
            [class.is-active]="showEmoji"
            (mousedown)="$event.preventDefault(); toggleEmoji()">😊</button>
        </div>

      </div>

      <!-- ── Link bar ── -->
      @if (showLink) {
        <div class="re-link-bar">
          <input class="re-link-input" type="url"
            [(ngModel)]="linkUrl"
            placeholder="https://exemple.com"
            (keydown.enter)="applyLink()"
            (keydown.escape)="showLink = false"
            #linkInput />
          <button class="re-link-btn re-link-ok" type="button" (click)="applyLink()">✓</button>
          @if (active('link')) {
            <button class="re-link-btn re-link-rm" type="button" (click)="removeLink()">✕</button>
          }
        </div>
      }

      <!-- ── Emoji picker ── -->
      @if (showEmoji) {
        <div class="re-emoji-panel">
          @for (e of emojis; track e) {
            <button class="re-emoji-btn" type="button"
              (mousedown)="$event.preventDefault(); insertEmoji(e)">{{ e }}</button>
          }
        </div>
      }

      <!-- ── Editable area (Tiptap mounts here) ── -->
      <div class="re-editor" #editorEl></div>

    </div>
  `,
  styles: [`
    /* ── Container ── */
    .re-wrap {
      border: 2px solid var(--color-ink);
      border-radius: 14px;
      overflow: hidden;
      background: var(--color-paper);
      box-shadow: 3px 3px 0 var(--color-ink);
    }

    /* ── Toolbar ── */
    .re-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 8px 10px;
      background: var(--color-cream);
      border-bottom: 2px solid var(--color-ink);
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      white-space: nowrap;
    }
    .re-toolbar::-webkit-scrollbar { display: none; }

    .re-group { display: inline-flex; gap: 2px; flex-shrink: 0; }

    .re-sep {
      display: inline-block;
      width: 1px; height: 22px;
      background: rgba(45,45,45,0.18);
      margin: 0 4px; flex-shrink: 0;
      vertical-align: middle;
    }

    .re-btn {
      min-width: 34px; height: 34px;
      padding: 0 6px;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent;
      border: none; border-radius: 8px;
      font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 800;
      color: var(--color-ink); cursor: pointer; user-select: none;
      transition: background 0.1s; flex-shrink: 0; line-height: 1;
    }
    .re-btn:hover { background: rgba(45,45,45,0.1); }
    .re-btn.is-active {
      background: var(--color-ink); color: var(--color-paper);
    }

    /* Inline format styles */
    .re-b    { font-weight: 900; }
    .re-i    { font-style: italic; letter-spacing: 0; }
    .re-u    { text-decoration: underline; }
    .re-s    { text-decoration: line-through; }
    .re-mark { background: #FFE566; color: var(--color-ink) !important; border-radius: 4px; padding: 0 3px; }
    .re-mark.is-active { background: var(--color-ink); color: #FFE566 !important; }
    .re-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

    /* ── Link bar ── */
    .re-link-bar {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px;
      background: var(--color-cream);
      border-bottom: 2px solid var(--color-ink);
    }
    .re-link-input {
      flex: 1; font-family: 'Nunito', sans-serif; font-size: 13px;
      padding: 7px 10px; border: 2px solid var(--color-ink); border-radius: 8px;
      background: var(--color-paper); outline: none; min-width: 0;
    }
    .re-link-input:focus { border-color: var(--color-sky); box-shadow: 2px 2px 0 var(--color-sky); }
    .re-link-btn {
      height: 34px; padding: 0 12px;
      border: 2px solid var(--color-ink); border-radius: 8px;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 14px;
      cursor: pointer; flex-shrink: 0;
    }
    .re-link-ok { background: var(--color-mint); color: #fff; }
    .re-link-rm { background: #FFE3E3; color: var(--color-ink); }

    /* ── Emoji panel ── */
    .re-emoji-panel {
      display: flex; flex-wrap: wrap; gap: 1px;
      padding: 8px 10px;
      background: var(--color-cream);
      border-bottom: 2px solid var(--color-ink);
      max-height: 144px; overflow-y: auto;
    }
    .re-emoji-btn {
      width: 36px; height: 36px; border: none;
      background: transparent; border-radius: 6px; font-size: 19px;
      cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center;
      transition: background 0.1s;
    }
    .re-emoji-btn:hover { background: rgba(45,45,45,0.1); }

    /* ── ProseMirror content area ── */
    .re-editor .ProseMirror {
      outline: none;
      min-height: 120px;
      padding: 14px 16px;
      font-family: 'Nunito', sans-serif; font-size: 15px; line-height: 1.7;
      color: var(--color-ink);
      word-wrap: break-word;
    }

    .re-editor .ProseMirror > * + * { margin-top: 0.4em; }
    .re-editor .ProseMirror p { margin: 0; }

    .re-editor .ProseMirror h1 { font-family: 'Fredoka One', cursive; font-size: 26px; line-height: 1.2; margin: 0.2em 0; }
    .re-editor .ProseMirror h2 { font-family: 'Fredoka One', cursive; font-size: 21px; line-height: 1.3; margin: 0.2em 0; }
    .re-editor .ProseMirror h3 { font-family: 'Fredoka One', cursive; font-size: 17px; line-height: 1.4; margin: 0.2em 0; }

    .re-editor .ProseMirror ul, .re-editor .ProseMirror ol { padding-left: 22px; margin: 0; }
    .re-editor .ProseMirror li { margin: 0.1em 0; }

    /* Task list */
    .re-editor .ProseMirror ul[data-type="taskList"] {
      list-style: none; padding-left: 2px;
    }
    .re-editor .ProseMirror ul[data-type="taskList"] li {
      display: flex; align-items: flex-start; gap: 8px;
    }
    .re-editor .ProseMirror ul[data-type="taskList"] li > label {
      flex-shrink: 0; display: flex; align-items: center; padding-top: 2px;
    }
    .re-editor .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
      width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-mint);
    }
    .re-editor .ProseMirror ul[data-type="taskList"] li > div { flex: 1; min-width: 0; }
    .re-editor .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
      text-decoration: line-through; opacity: 0.55;
    }

    /* Blockquote */
    .re-editor .ProseMirror blockquote {
      border-left: 4px solid var(--color-coral);
      margin: 0.4em 0; padding: 6px 14px;
      background: var(--color-cream); border-radius: 0 8px 8px 0;
      font-style: italic;
    }
    .re-editor .ProseMirror blockquote p { margin: 0; }

    /* Code */
    .re-editor .ProseMirror code {
      font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px;
      background: rgba(45,45,45,0.08); padding: 1px 5px; border-radius: 4px;
    }
    .re-editor .ProseMirror pre {
      background: #1e1e2e; color: #cdd6f4;
      border-radius: 10px; padding: 14px 16px; margin: 0.2em 0;
      font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px;
      overflow-x: auto; line-height: 1.6;
    }
    .re-editor .ProseMirror pre code {
      background: none; padding: 0; color: inherit; font-size: inherit;
    }

    /* Link */
    .re-editor .ProseMirror a { color: var(--color-sky); text-decoration: underline; cursor: pointer; }

    /* HR */
    .re-editor .ProseMirror hr {
      border: none; border-top: 2px solid rgba(45,45,45,0.18); margin: 0.8em 0;
    }

    /* Highlight */
    .re-editor .ProseMirror mark {
      background: #FFE566; border-radius: 3px; padding: 0 2px; color: inherit;
    }

    /* Placeholder */
    .re-editor .ProseMirror .is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left; color: rgba(45,45,45,0.35);
      pointer-events: none; height: 0;
    }

    /* Images */
    .re-editor .ProseMirror img { width: 100%; height: auto; display: block; border-radius: 8px; }

    /* Selection */
    .re-editor .ProseMirror *::selection { background: rgba(78,205,196,0.25); }

    /* Focused ring */
    .re-wrap:focus-within {
      border-color: var(--color-sky);
      box-shadow: 3px 3px 0 var(--color-sky);
    }
  `],
})
export class RichEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorEl') editorEl!: ElementRef<HTMLDivElement>;
  @ViewChild('linkInput') linkInputRef?: ElementRef<HTMLInputElement>;

  @Input() value = '';
  @Input() placeholder = 'Écrivez…';
  @Output() valueChange = new EventEmitter<string>();

  private cdr = inject(ChangeDetectorRef);

  editor?: Editor;
  showEmoji = false;
  showLink = false;
  linkUrl = '';
  readonly emojis = EMOJIS;

  private focused = false;
  private closePopups?: (e: MouseEvent) => void;

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.editorEl.nativeElement,
      extensions: [
        StarterKit,
        Underline,
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        Placeholder.configure({ placeholder: this.placeholder }),
      ],
      content: toHtml(this.value),
      onFocus:  () => { this.focused = true; },
      onBlur:   () => { this.focused = false; },
      onUpdate: ({ editor }) => {
        this.valueChange.emit(editor.getHTML());
        this.cdr.markForCheck();
      },
      onTransaction: () => this.cdr.markForCheck(),
    });

    // Close emoji/link panels when clicking outside the component
    this.closePopups = (e: MouseEvent) => {
      const el = this.editorEl?.nativeElement?.closest('.re-wrap');
      if (el && !el.contains(e.target as Node)) {
        this.showEmoji = false;
        this.showLink = false;
        this.cdr.markForCheck();
      }
    };
    document.addEventListener('click', this.closePopups);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.editor && !this.focused) {
      const html = toHtml(changes['value'].currentValue ?? '');
      const current = this.editor.getHTML();
      if (html !== current) {
        this.editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.closePopups) document.removeEventListener('click', this.closePopups);
    this.editor?.destroy();
  }

  // ── Toolbar helpers ───────────────────────────────────────────────

  active(name: string, attrs?: Record<string, unknown>): boolean {
    return this.editor?.isActive(name, attrs) ?? false;
  }

  cmd(command: string, attrs?: Record<string, unknown>): void {
    const c = this.editor?.chain().focus();
    if (!c) return;
    switch (command) {
      case 'toggleBold':         c.toggleBold().run();          break;
      case 'toggleItalic':       c.toggleItalic().run();        break;
      case 'toggleUnderline':    c.toggleUnderline().run();     break;
      case 'toggleStrike':       c.toggleStrike().run();        break;
      case 'toggleHighlight':    c.toggleHighlight().run();     break;
      case 'toggleBulletList':   c.toggleBulletList().run();    break;
      case 'toggleOrderedList':  c.toggleOrderedList().run();   break;
      case 'toggleTaskList':     c.toggleTaskList().run();      break;
      case 'toggleBlockquote':   c.toggleBlockquote().run();    break;
      case 'toggleCodeBlock':    c.toggleCodeBlock().run();     break;
      case 'setHorizontalRule':  c.setHorizontalRule().run();   break;
      case 'toggleHeading':
        c.toggleHeading(attrs as { level: 1 | 2 | 3 }).run();
        break;
    }
    this.cdr.markForCheck();
  }

  openLink(): void {
    this.showEmoji = false;
    this.showLink = !this.showLink;
    if (this.showLink) {
      this.linkUrl = this.editor?.getAttributes('link')['href'] ?? '';
      setTimeout(() => this.linkInputRef?.nativeElement?.focus(), 0);
    }
  }

  applyLink(): void {
    const url = this.linkUrl.trim();
    if (!url) {
      this.editor?.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\/|^\//.test(url) ? url : `https://${url}`;
      this.editor?.chain().focus().setLink({ href }).run();
    }
    this.showLink = false;
    this.cdr.markForCheck();
  }

  removeLink(): void {
    this.editor?.chain().focus().unsetLink().run();
    this.showLink = false;
    this.cdr.markForCheck();
  }

  toggleEmoji(): void {
    this.showEmoji = !this.showEmoji;
    this.showLink = false;
  }

  insertEmoji(emoji: string): void {
    this.editor?.chain().focus().insertContent(emoji).run();
    this.showEmoji = false;
    this.cdr.markForCheck();
  }
}
