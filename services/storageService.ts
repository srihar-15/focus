
import { 
  LearningConcept, 
  LCStatus, 
  Unit, 
  AttachedFile,
  RevisionRecord
} from '../types';
import { 
  UNITS_DATA, 
  INITIAL_STORAGE_KEY, 
  LCS_PER_UNIT 
} from '../constants';

const DB_NAME = 'FocusStudyDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'current_session';

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };
    });
  }

  private async getRawDB(): Promise<any> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(DATA_KEY);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(this.initializeDB());
        } else {
          resolve(request.result);
        }
      };
      request.onerror = () => reject('Failed to get data');
    });
  }

  private async saveRawDB(data: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, DATA_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject('Failed to save data');
    });
  }

  private initializeDB() {
    const lcs: LearningConcept[] = [];
    UNITS_DATA.forEach(unit => {
      for (let i = 1; i <= LCS_PER_UNIT; i++) {
        lcs.push({
          id: `${unit.id}-lc${i}`,
          unitId: unit.id,
          title: `Concept ${i}`,
          status: LCStatus.NOT_UPLOADED,
          revisionCount: 0,
          easeFactor: 2.5,
          interval: 0,
          repetition: 0,
          files: [],
          revisionHistory: []
        });
      }
    });

    const db = { units: UNITS_DATA, lcs };
    // This initial save is handled by the caller or first get
    return db;
  }

  async getUnits(): Promise<Unit[]> {
    const db = await this.getRawDB();
    return db.units;
  }

  async getLCs(unitId?: string): Promise<LearningConcept[]> {
    const db = await this.getRawDB();
    const lcs = db.lcs;
    const now = new Date();
    
    const updatedLCs = lcs.map((lc: LearningConcept) => {
      if (lc.status === LCStatus.NOT_UPLOADED) return lc;
      
      if (lc.nextReviewAt) {
        const nextReview = new Date(lc.nextReviewAt);
        if (now >= nextReview) {
          return { ...lc, status: LCStatus.NEEDS_REVISION };
        }
      } else {
        return { ...lc, status: LCStatus.NEEDS_REVISION };
      }
      return lc;
    });

    if (unitId) {
      return updatedLCs.filter((lc: LearningConcept) => lc.unitId === unitId);
    }
    return updatedLCs;
  }

  async addFilesToLC(lcId: string, newFiles: AttachedFile[]): Promise<void> {
    const db = await this.getRawDB();
    const lcIndex = db.lcs.findIndex((lc: LearningConcept) => lc.id === lcId);
    
    if (lcIndex === -1) return;

    const lc = db.lcs[lcIndex];
    const updatedFiles = [...lc.files, ...newFiles];
    
    db.lcs[lcIndex] = {
      ...lc,
      files: updatedFiles,
      status: lc.status === LCStatus.NOT_UPLOADED ? LCStatus.NEEDS_REVISION : lc.status
    };
    
    await this.saveRawDB(db);
  }

  async removeFileFromLC(lcId: string, fileId: string): Promise<void> {
    const db = await this.getRawDB();
    const lcIndex = db.lcs.findIndex((lc: LearningConcept) => lc.id === lcId);
    
    if (lcIndex === -1) return;

    const lc = db.lcs[lcIndex];
    const updatedFiles = lc.files.filter((f: AttachedFile) => f.id !== fileId);
    
    db.lcs[lcIndex] = {
      ...lc,
      files: updatedFiles,
      status: updatedFiles.length === 0 ? LCStatus.NOT_UPLOADED : lc.status
    };
    
    await this.saveRawDB(db);
  }

  async markRevised(lcId: string, quality: number): Promise<void> {
    const db = await this.getRawDB();
    const lcIndex = db.lcs.findIndex((lc: LearningConcept) => lc.id === lcId);
    if (lcIndex === -1) return;

    const lc = db.lcs[lcIndex];
    let { repetition, interval, easeFactor } = lc;

    if (quality >= 3) {
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetition++;
    } else {
      repetition = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const lastRevisedAt = new Date().toISOString();
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    const record: RevisionRecord = {
      date: lastRevisedAt,
      quality,
      interval,
      easeFactor
    };

    db.lcs[lcIndex] = {
      ...lc,
      revisionCount: lc.revisionCount + 1,
      lastRevisedAt,
      nextReviewAt: nextReviewAt.toISOString(),
      repetition,
      interval,
      easeFactor,
      status: LCStatus.UPLOADED,
      revisionHistory: [record, ...lc.revisionHistory].slice(0, 50)
    };

    await this.saveRawDB(db);
  }
}

export const storageService = new StorageService();
