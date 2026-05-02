import { useRef, useEffect } from 'react';

export type MoSCoW = 'Must Have' | 'Should Have' | 'Could Have' | "Won't Have";

export interface AcItem {
  id: string;
  text: string; // stored as HTML
}

export interface StoryCard {
  id: string;
  seq: number;
  priority: MoSCoW;
  story: string;
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

const GWT_KEYWORDS = ['Given', 'When', 'Then', 'And'] as const;

// ── RichAcItem ──────────────────────────────────────────────────────────────

interface RichAcItemProps {
  value: string;
  disabled: boolean;
  label: string;
  onChange: (html: string) => void;
}

function RichAcItem({ value, disabled, label, onChange }: RichAcItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Set initial HTML on mount only — never overwrite during typing (cursor preservation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, []);

  const isEmpty = value === '' || value === '<br>';

  return (
    <div className="space-y-1">
      {/* Format toolbar — onMouseDown+preventDefault keeps focus in the editor */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Bold"
          disabled={disabled}
          onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false); }}
          className="px-1.5 py-0.5 text-xs font-bold bg-gray-800 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-40 transition-colors"
        >
          B
        </button>
        <button
          type="button"
          title="Italic"
          disabled={disabled}
          onMouseDown={e => { e.preventDefault(); document.execCommand('italic', false); }}
          className="px-1.5 py-0.5 text-xs italic bg-gray-800 hover:bg-gray-700 rounded text-gray-300 disabled:opacity-40 transition-colors"
        >
          I
        </button>
        <span className="w-px h-3 bg-gray-700 mx-0.5" />
        {GWT_KEYWORDS.map(kw => (
          <button
            key={kw}
            type="button"
            disabled={disabled}
            onMouseDown={e => { e.preventDefault(); document.execCommand('insertText', false, kw + ' '); }}
            className="px-1.5 py-0.5 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors"
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Contenteditable editor — renders real bold/italic */}
      <div className="relative">
        {isEmpty && (
          <span className="absolute top-1.5 left-2 text-xs text-gray-600 pointer-events-none select-none">
            Given [context], when [action], then [outcome].
          </span>
        )}
        <div
          ref={ref}
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
          className="min-h-[2.5rem] bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded text-xs text-gray-200 px-2 py-1.5 leading-relaxed"
        />
      </div>
    </div>
  );
}

// ── UserStoryCard ────────────────────────────────────────────────────────────

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
  const storyId = `US-${String(card.seq).padStart(3, '0')}`;

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

      {/* Free-form story description */}
      <textarea
        rows={3}
        value={card.story}
        onChange={e => onChange({ ...card, story: e.target.value })}
        disabled={isSubmitting}
        aria-label="user story"
        placeholder={'As a [user type], I want [goal] so that [reason].\n(Write it your way — any format that clearly describes the story.)'}
        className="w-full resize-none bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none rounded text-sm text-gray-100 placeholder-gray-600 px-3 py-2 leading-relaxed disabled:opacity-40"
      />

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
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-gray-600 text-xs mt-8 select-none shrink-0">—</span>
            <div className="flex-1 min-w-0">
              <RichAcItem
                value={item.text}
                disabled={isSubmitting}
                label={`acceptance criterion ${i + 1}`}
                onChange={html => updateAc(item.id, html)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeAc(item.id)}
              disabled={isSubmitting}
              aria-label={`remove ac ${i + 1}`}
              className="text-gray-600 hover:text-red-400 disabled:opacity-40 text-sm mt-8 transition-colors shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
