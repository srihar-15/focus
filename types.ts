
export enum LCStatus {
  NOT_UPLOADED = 'NOT_UPLOADED',
  UPLOADED = 'UPLOADED',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded string
  uploadedAt: string;
}

export interface RevisionRecord {
  date: string;
  quality: number;
  interval: number;
  easeFactor: number;
}

export interface LearningConcept {
  id: string;
  unitId: string;
  title: string;
  status: LCStatus;
  revisionCount: number;
  lastRevisedAt?: string;
  nextReviewAt?: string;
  easeFactor: number; // SM-2 Ease Factor
  interval: number;   // Current interval in days
  repetition: number; // Number of successful consecutive repetitions
  files: AttachedFile[];
  revisionHistory: RevisionRecord[];
}

export interface Unit {
  id: string;
  title: string;
  order: number;
}

export interface UserSession {
  isAuthenticated: boolean;
  username: string | null;
}

export interface StudyStats {
  totalUnits: number;
  totalLCs: number;
  uploadedCount: number;
  remainingCount: number;
  needsRevisionCount: number;
}
