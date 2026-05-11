import { Injectable } from '@angular/core';
import { Hunt, Step, Enigma, StepAnswer } from '../../types';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class HuntService {
  constructor(private storage: StorageService) {}

  generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  createEmptyAnswer(): StepAnswer {
    return { type: 'text', text: '', caseSensitive: false, options: [], mediaAccept: { photo: true, video: true } };
  }

  createEmptyEnigma(): Enigma {
    return { id: this.generateId(), title: '', description: '', answer: this.createEmptyAnswer() };
  }

  createEmptyStep(): Step {
    return {
      id: this.generateId(),
      title: '',
      address: '',
      lat: 48.8566,
      lng: 2.3522,
      enigmas: [this.createEmptyEnigma()],
      media: [],
    };
  }

  createEmptyHunt(): Hunt {
    return {
      id: this.generateId(),
      name: '',
      description: '',
      accessCode: this.generateCode(),
      steps: [this.createEmptyStep()],
      createdAt: new Date().toISOString(),
      published: false,
    };
  }

  publishHunt(hunt: Hunt): Hunt {
    const published = { ...hunt, published: true };
    this.storage.saveHunt(published);
    return published;
  }

  saveDraft(hunt: Hunt): void {
    this.storage.saveHunt(hunt);
  }

  checkAnswer(
    textInput: string,
    selectedIds: string[],
    answer: StepAnswer,
    mediaFile?: File | null,
  ): boolean {
    if (answer.type === 'media') return !!mediaFile;
    if (answer.type === 'text') {
      const a = answer.caseSensitive ? textInput.trim() : textInput.trim().toLowerCase();
      const b = answer.caseSensitive ? answer.text : answer.text.toLowerCase();
      return a === b;
    }
    const correctIds = answer.options.filter(o => o.isCorrect).map(o => o.id);
    if (correctIds.length === 0) return false;
    if (answer.type === 'radio') {
      return selectedIds.length === 1 && selectedIds[0] === correctIds[0];
    }
    if (selectedIds.length !== correctIds.length) return false;
    return correctIds.every(id => selectedIds.includes(id));
  }
}
