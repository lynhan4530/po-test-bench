import type { JudgeFeedbackOutput } from '../types/session';

interface JudgeFeedbackProps {
  feedback: JudgeFeedbackOutput;
  onNewChallenge: () => void;
  onBackToMenu: () => void;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round((score / 5) * 100);
  const colour =
    score >= 4 ? 'bg-emerald-500' :
    score >= 3 ? 'bg-yellow-500' :
    'bg-red-500';
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1.5">
      <div
        className={`${colour} h-1.5 rounded-full`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function JudgeFeedback({ feedback, onNewChallenge, onBackToMenu }: JudgeFeedbackProps) {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Judge's Verdict</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Overall score: <span className="text-white font-semibold">{feedback.overallScore}/5</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onBackToMenu}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-gray-200 transition-colors"
          >
            Menu
          </button>
          <button
            onClick={onNewChallenge}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm font-medium text-white transition-colors"
          >
            New Challenge
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-200 leading-relaxed">{feedback.summary}</p>

      <div className="space-y-4">
        {feedback.scores.map(s => (
          <div key={s.dimension} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{s.dimension}</span>
              <span className="text-sm font-bold text-gray-300">{s.score}/5</span>
            </div>
            <ScoreBar score={s.score} />
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">{s.feedback}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
