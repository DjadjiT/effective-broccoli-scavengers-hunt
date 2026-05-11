export interface StepMedia {
  id: string;
  type: 'image' | 'video' | 'file';
  name: string;
  url: string;
  size: number;
}

export type AnswerType = 'text' | 'checkbox' | 'radio' | 'media';

export interface AnswerOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface MediaAccept {
  photo: boolean;
  video: boolean;
}

export interface StepAnswer {
  type: AnswerType;
  text: string;
  caseSensitive: boolean;
  options: AnswerOption[];
  mediaAccept: MediaAccept;
}

export interface Enigma {
  id: string;
  title: string;
  description: string;
  answer: StepAnswer;
}

export interface Step {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  enigmas: Enigma[];
  media: StepMedia[];
}

export interface Hunt {
  id: string;
  name: string;
  description?: string;
  accessCode: string;
  steps: Step[];
  createdAt: string;
  published: boolean;
}

export interface PlayerProgress {
  huntCode: string;
  currentStepIndex: number;
  completedStepIds: string[];
  startedAt: string;
  completedAt?: string;
  hintsUsed: number;
}

export type Language = 'fr' | 'en';
