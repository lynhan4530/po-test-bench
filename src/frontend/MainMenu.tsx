import type { HistoryEntry } from './history';
import DifficultySelector from './DifficultySelector';
import ChallengeHistory from './ChallengeHistory';
import ProgressPanel from './ProgressPanel';

interface MainMenuProps {
  history: HistoryEntry[];
  difficulty: 1 | 2 | 3 | 4;
  isStarting: boolean;
  onDifficultyChange: (d: 1 | 2 | 3 | 4) => void;
  onStart: () => void;
  onResume: (sessionId: string) => void;
  onViewResult: (entry: HistoryEntry) => void;
  onDeleteEntry: (sessionId: string) => void;
  onClearHistory: () => void;
}

export default function MainMenu({
  history,
  difficulty,
  isStarting,
  onDifficultyChange,
  onStart,
  onResume,
  onViewResult,
  onDeleteEntry,
  onClearHistory,
}: MainMenuProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-white">
      <header className="px-5 py-3 border-b border-gray-800 bg-gray-900">
        <span className="font-bold text-base tracking-tight">PO Test Bench</span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-5 py-8 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-white">Practice the hardest part of the PO job.</h1>
          <p className="text-sm text-gray-400 mt-1">
            Write specs, defend them to a skeptical dev and QA, earn a score.
          </p>
        </div>

        {/* Difficulty + CTA */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Difficulty</h3>
          <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
          <button
            onClick={onStart}
            disabled={isStarting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-semibold text-white transition-colors"
          >
            {isStarting ? 'Starting challenge…' : 'Start New Challenge'}
          </button>
        </div>

        {/* History */}
        <ChallengeHistory
          entries={history}
          onResume={onResume}
          onViewResult={onViewResult}
          onDeleteEntry={onDeleteEntry}
          onClear={onClearHistory}
        />

        {/* Progress */}
        <ProgressPanel entries={history} />
      </div>
    </div>
  );
}
