import type { HistoryEntry } from './history';

interface ProgressPanelProps {
  entries: HistoryEntry[];
}

const DIMENSIONS = [
  'Defensibility',
  'Adaptability',
  'Clarity',
  'Document Quality',
  'Risk Awareness',
];

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const colour =
    score >= 4 ? 'bg-emerald-500' :
    score >= 3 ? 'bg-yellow-500' :
    'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`${colour} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  );
}

export default function ProgressPanel({ entries }: ProgressPanelProps) {
  const complete = entries.filter(e => e.phase === 'complete' && e.overallScore !== undefined);
  if (!complete.length) return null;

  const overallScores = complete.map(e => e.overallScore as number);
  const avgOverall = avg(overallScores);
  const bestScore = Math.max(...overallScores);

  const dimScores = DIMENSIONS.map(dim => {
    const scores = complete.flatMap(e =>
      (e.scores ?? []).filter(s => s.dimension === dim).map(s => s.score)
    );
    return { dim, score: avg(scores) };
  }).filter(d => d.score > 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Your Progress</h3>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-white">{complete.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{avgOverall.toFixed(1)}<span className="text-sm font-normal text-gray-500">/5</span></p>
          <p className="text-xs text-gray-500 mt-0.5">Avg Score</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{bestScore.toFixed(1)}<span className="text-sm font-normal text-gray-500">/5</span></p>
          <p className="text-xs text-gray-500 mt-0.5">Best</p>
        </div>
      </div>

      {dimScores.length > 0 && (
        <div className="space-y-2 pt-1">
          {dimScores.map(({ dim, score }) => (
            <div key={dim} className="space-y-1">
              <p className="text-xs text-gray-400">{dim}</p>
              <ScoreBar score={score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
