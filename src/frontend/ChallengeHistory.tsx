import type { HistoryEntry } from './history';

interface ChallengeHistoryProps {
  entries: HistoryEntry[];
  onResume: (id: string) => void;
  onViewResult: (entry: HistoryEntry) => void;
  onDeleteEntry: (sessionId: string) => void;
  onClear: () => void;
}

const DIFFICULTY_LABEL: Record<number, string> = { 1: 'Rookie', 2: 'Standard', 3: 'Senior', 4: 'Principal' };

function PhaseTag({ phase, expired }: { phase: HistoryEntry['phase']; expired?: boolean }) {
  if (expired) {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Expired</span>;
  }
  if (phase === 'complete') {
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-400">Complete ✓</span>;
  }
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-400">In Progress ●</span>;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChallengeHistory({ entries, onResume, onViewResult, onDeleteEntry, onClear }: ChallengeHistoryProps) {
  if (!entries.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">Recent Challenges</h3>
        <p className="text-sm text-gray-500">No challenges yet. Start one above!</p>
      </div>
    );
  }

  const displayed = entries.slice(0, 10);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Recent Challenges</h3>

      <div className="space-y-2">
        {displayed.map(entry => (
          <div key={entry.sessionId} className="border border-gray-800 rounded-lg p-3 bg-gray-950 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">{entry.industry} · {entry.companyType}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                  {DIFFICULTY_LABEL[entry.difficulty] ?? 'Rookie'}
                </span>
              </div>
              <span className="text-[10px] text-gray-600 shrink-0">{formatDate(entry.date)}</span>
            </div>

            <p className="text-xs text-gray-300 leading-snug mb-2 line-clamp-2">
              {entry.triggerTask}
            </p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PhaseTag phase={entry.phase} expired={entry.sessionExpired} />
                {entry.overallScore !== undefined && (
                  <span className="text-xs text-gray-400">{entry.overallScore}/5</span>
                )}
              </div>
              <div className="flex gap-2">
                {entry.phase === 'complete' ? (
                  <button
                    onClick={() => onViewResult(entry)}
                    className="text-xs px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-200 transition-colors"
                  >
                    View Results
                  </button>
                ) : !entry.sessionExpired ? (
                  <button
                    onClick={() => onResume(entry.sessionId)}
                    className="text-xs px-2.5 py-1 bg-blue-800 hover:bg-blue-700 rounded text-blue-100 transition-colors"
                  >
                    Resume
                  </button>
                ) : null}
                <button
                  onClick={() => onDeleteEntry(entry.sessionId)}
                  className="text-xs px-2 py-1 text-gray-600 hover:text-red-400 transition-colors"
                  aria-label="Delete entry"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <button
          onClick={onClear}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          Clear history
        </button>
      )}
    </div>
  );
}
