import { useRef } from 'react';

export type MoSCoW = 'Must Have' | 'Should Have' | 'Could Have' | "Won't Have";

export interface AcItem {
  id: string;
  text: string;
}

export interface StoryCard {
  id: string;
  seq: number;
  priority: MoSCoW;
  role: string;
  goal: string;
  benefit: string;
  ac: AcItem[];
}

const MOSCOW_OPTIONS: MoSCoW[] = ['Must Have', 'Should Have', 'Could Have', "Won't Have"];

const BORDER_COLOR: Record<MoSCoW, string> = {
  'Must Have':   'border-blue-500',
  'Should Have': 'border-yellow-500',
  'Could Have':  'border-gray-500',
  "Won't Have":  'border-red-500',
};

const PRIORITY_ACTIVE: Record<MoSCoW, string> = {
  'Must Have':   'bg-blue-700 text-white',
  'Should Have': 'bg-yellow-700 text-white',
  'Could Have':  'bg-gray-700 text-white',
  "Won't Have":  'bg-red-800 text-white',
};

const PRIORITY_INACTIVE = 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200';

interface FormatToolbarProps {
  getRef: () => HTMLTextAreaElement | null;
  value: string;
  onChange: (v: string) => void;
}

function FormatToolbar({ getRef, value, onChange }: FormatToolbarProps) {
  function wrap(before: string, after: string) {
    const ta = getRef();
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);
    const newValue = value.slice(0, s) + before + selected + after + value.slice(e);
    const newStart = s + before.length;
    const newEnd = newStart + selected.length;
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.setSelectionRange(newStart, newEnd);
      ta.focus();
    });
  }

  function insertPrefix(prefix: string) {
    const ta = getRef();
    if (!ta) return;
    const { selectionStart: s } = ta;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    const newCursor = s + prefix.length;
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.setSelectionRange(newCursor, newCursor);
      ta.focus();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Bold"
        onClick={() => wrap('**', '**')}
        className="px-1.5 py-0.5 text-xs font-bold bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => wrap('*', '*')}
        className="px-1.5 py-0.5 text-xs italic bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
      >
        I
      </button>
      <select
        defaultValue=""
        onChange={e => {
          if (e.target.value) insertPrefix(e.target.value + ' ');
          e.target.value = '';
        }}
        className="text-xs bg-gray-800 border-0 text-gray-400 rounded px-1 py-0.5 cursor-pointer"
        title="Insert keyword"
      >
        <option value="">Insert…</option>
        <option value="Given">Given</option>
        <option value="When">When</option>
        <option value="Then">Then</option>
        <option value="And">And</option>
        <option value="But">But</option>
      </select>
    </div>
  );
}

interface UserStoryCardProps {
  card: StoryCard;
  index: number;
  total: number;
  isSubmitting: boolean;
  onChange: (updated: StoryCard) => void;
  onDelete: () => void;
}

export default function UserStoryCard({
  card,
  index,
  total,
  isSubmitting,
  onChange,
  onDelete,
}: UserStoryCardProps) {
  const acRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const storyId = `US-${String(card.seq).padStart(3, '0')}`;

  function updateField(field: 'role' | 'goal' | 'benefit', value: string) {
    onChange({ ...card, [field]: value });
  }

  function updateAc(id: string, text: string) {
    onChange({ ...card, ac: card.ac.map(a => (a.id === id ? { ...a, text } : a)) });
  }

  function addAc() {
    onChange({ ...card, ac: [...card.ac, { id: crypto.randomUUID(), text: '' }] });
  }

  function removeAc(id: string) {
    onChange({ ...card, ac: card.ac.filter(a => a.id !== id) });
  }

  return (
    <div
      className={`bg-gray-900 border border-gray-800 border-l-4 ${BORDER_COLOR[card.priority]} rounded-lg p-4 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {storyId}
        </span>
        {total > 1 && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isSubmitting}
            aria-label={`Remove story ${index + 1}`}
            className="text-xs text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Priority selector */}
      <div className="flex gap-1.5 flex-wrap">
        {MOSCOW_OPTIONS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...card, priority: p })}
            disabled={isSubmitting}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
              card.priority === p ? PRIORITY_ACTIVE[p] : PRIORITY_INACTIVE
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Story sentence */}
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2">
        <span className="text-gray-500 text-xs">As a</span>
        <input
          type="text"
          value={card.role}
          onChange={e => updateField('role', e.target.value)}
          disabled={isSubmitting}
          aria-label="role"
          placeholder="user type"
          className="min-w-0 flex-1 bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-sm text-gray-100 placeholder-gray-600 px-0.5 disabled:opacity-40"
        />
        <span className="text-gray-500 text-xs">, I want</span>
        <input
          type="text"
          value={card.goal}
          onChange={e => updateField('goal', e.target.value)}
          disabled={isSubmitting}
          aria-label="goal"
          placeholder="action or feature"
          className="min-w-0 flex-1 bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-sm text-gray-100 placeholder-gray-600 px-0.5 disabled:opacity-40"
        />
        <span className="text-gray-500 text-xs">so that</span>
        <input
          type="text"
          value={card.benefit}
          onChange={e => updateField('benefit', e.target.value)}
          disabled={isSubmitting}
          aria-label="benefit"
          placeholder="outcome or value"
          className="min-w-0 flex-1 bg-transparent border-b border-gray-700 focus:border-blue-500 outline-none text-sm text-gray-100 placeholder-gray-600 px-0.5 disabled:opacity-40"
        />
        <span className="text-gray-300 text-sm">.</span>
      </div>

      {/* Acceptance Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Acceptance Criteria
          </span>
          <button
            type="button"
            onClick={addAc}
            disabled={isSubmitting}
            className="text-xs px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </div>

        {card.ac.length === 0 && (
          <p className="text-xs text-gray-600 italic">
            Add at least one acceptance criterion.
          </p>
        )}

        {card.ac.map((item, i) => (
          <div key={item.id} className="space-y-1">
            <FormatToolbar
              getRef={() => acRefs.current.get(item.id) ?? null}
              value={item.text}
              onChange={text => updateAc(item.id, text)}
            />
            <div className="flex items-start gap-2">
              <span className="text-gray-600 text-xs mt-2 select-none shrink-0">—</span>
              <textarea
                ref={el => {
                  if (el) acRefs.current.set(item.id, el);
                  else acRefs.current.delete(item.id);
                }}
                rows={2}
                value={item.text}
                onChange={e => updateAc(item.id, e.target.value)}
                disabled={isSubmitting}
                aria-label={`acceptance criterion ${i + 1}`}
                placeholder="Given [context], when [action], then [outcome]."
                className="flex-1 resize-none bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded text-xs text-gray-200 placeholder-gray-600 px-2 py-1.5 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => removeAc(item.id)}
                disabled={isSubmitting}
                aria-label={`remove ac ${i + 1}`}
                className="text-gray-600 hover:text-red-400 disabled:opacity-40 text-sm mt-1.5 transition-colors shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
