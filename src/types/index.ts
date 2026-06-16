export interface StepMedia {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
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

export interface Hint {
  id: string;
  text: string;
  unlockAfterAttempts: number;
}

export interface Enigma {
  id: string;
  title: string;
  description: string;
  answer: StepAnswer;
  points: number;
  hints?: Hint[];
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

export type HuntStatus = 'draft' | 'ready' | 'started' | 'finished';

export interface Hunt {
  id: string;
  name: string;
  description?: string;
  media?: StepMedia[];
  steps: Step[];
  createdAt: string;
  published: boolean;
  createdBy: string;
  status: HuntStatus;
  durationSeconds: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface PlayerProgress {
  huntCode: string;
  currentStepIndex: number;
  completedStepIds: string[];
  startedAt: string;
  completedAt?: string;
  hintsUsed: number;
  earnedPoints: number;
}

export type Language = 'fr' | 'en';

// ─────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Submissions / Moderation
// ─────────────────────────────────────────────────────────────

export type AnswerStatus = 'pending' | 'approved' | 'rejected';

export interface AnswerSubmission {
  id: string;
  huntId: string;
  stepId: string;
  enigmaId: string;
  teamId: string;
  teamName: string;
  stepTitle: string;
  enigmaTitle: string;
  type: AnswerType;
  textValue: string;
  selectedOptionIds: string[];
  mediaName: string;
  submittedAt: string;
  status: AnswerStatus;
  pointsAwarded: number;
  pointsPossible: number;
  reviewedAt?: string;
  reviewNote?: string;
}

// ─────────────────────────────────────────────────────────────
// Teams
// ─────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  huntId: string;
  name: string;
  accessCode: string;
  createdAt: string;
}
