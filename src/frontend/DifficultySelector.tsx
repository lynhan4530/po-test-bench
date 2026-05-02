const LEVELS: {
  value: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  comingSoon?: boolean;
}[] = [
  { value: 1, label: 'Rookie', description: 'Alex and Jordan are patient. Clear hints, one concern per turn.' },
  { value: 2, label: 'Standard', description: 'More pressure, fewer second chances. Moderate chaining.', comingSoon: true },
  { value: 3, label: 'Senior', description: 'Tight scrutiny. Personas chain frequently. Sign-off is hard-earned.', comingSoon: true },
  { value: 4, label: 'Principal', description: 'Contradictory documents, maximum chaining, brutal review.', comingSoon: true },
];

interface DifficultySelectorProps {
  value: 1 | 2 | 3 | 4;
  onChange: (v: 1 | 2 | 3 | 4) => void;
}

export default function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const selected = LEVELS.find(l => l.value === value) ?? LEVELS[0];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {LEVELS.map(level => (
          <button
            key={level.value}
            onClick={() => onChange(level.value)}
            className={`relative flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${
              value === level.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span className="block text-xs opacity-70 font-normal">{level.value}</span>
            {level.label}
            {level.comingSoon && (
              <span className="absolute -top-1.5 -right-1 bg-gray-700 text-gray-400 text-[9px] px-1 rounded">
                soon
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">{selected.description}</p>
    </div>
  );
}
