export interface HistoryEntry {
  sessionId: string;
  date: number;
  industry: string;
  companyType: string;
  triggerTask: string;
  difficulty: 1 | 2 | 3 | 4;
  phase: 'challenge' | 'review' | 'judging' | 'complete';
  overallScore?: number;
  scores?: Array<{ dimension: string; score: number; feedback: string }>;
  summary?: string;
  sessionExpired?: boolean;
}

const HISTORY_KEY = 'potb_history';
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}

export function upsertEntry(patch: Partial<HistoryEntry> & { sessionId: string }): void {
  const entries = loadHistory();
  const idx = entries.findIndex(e => e.sessionId === patch.sessionId);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...patch };
  } else {
    entries.unshift(patch as HistoryEntry);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
