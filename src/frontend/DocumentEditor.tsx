import { useState, useRef } from 'react';
import type { Trigger } from '../types/session';
import UserStoryCard from './UserStoryCard';
import type { StoryCard } from './UserStoryCard';

interface DocumentEditorProps {
  trigger: Trigger;
  isSubmitting: boolean;
  onSubmit: (content: string) => void;
}

function makeEmptyCard(seq: number): StoryCard {
  return {
    id: crypto.randomUUID(),
    seq,
    priority: 'Must Have',
    role: '',
    goal: '',
    benefit: '',
    ac: [{ id: crypto.randomUUID(), text: '' }],
  };
}

function serialize(cards: StoryCard[]): string {
  return cards
    .map(c => {
      const storyId = `US-${String(c.seq).padStart(3, '0')}`;
      const acLines = c.ac.map(a => `- ${a.text}`).join('\n');
      return `## ${storyId} [${c.priority}]\nAs a ${c.role}, I want ${c.goal} so that ${c.benefit}.\n\nAcceptance Criteria:\n${acLines}`;
    })
    .join('\n\n');
}

function isValid(cards: StoryCard[]): boolean {
  return cards.every(
    c =>
      c.role.trim() &&
      c.goal.trim() &&
      c.benefit.trim() &&
      c.ac.length > 0 &&
      c.ac.every(a => a.text.trim()),
  );
}

export default function DocumentEditor({ trigger, isSubmitting, onSubmit }: DocumentEditorProps) {
  const [cards, setCards] = useState<StoryCard[]>(() => [makeEmptyCard(1)]);
  const nextSeq = useRef(2);

  function updateCard(id: string, updated: StoryCard) {
    setCards(prev => prev.map(c => (c.id === id ? updated : c)));
  }

  function addCard() {
    const seq = nextSeq.current++;
    setCards(prev => [...prev, makeEmptyCard(seq)]);
  }

  function deleteCard(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
  }

  const serialized = serialize(cards);
  const charCount = serialized.length;
  const canSubmit = isValid(cards) && !isSubmitting;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Task callout */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-800 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Your task
        </p>
        <p className="text-sm text-gray-200 leading-relaxed">{trigger.task}</p>
        <p className="text-xs text-gray-600 mt-2">
          Add your user stories and acceptance criteria below, then submit for review.
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-6 pt-3 pb-2 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-500">
          {cards.length} {cards.length === 1 ? 'story' : 'stories'}
        </span>
        <button
          type="button"
          onClick={addCard}
          disabled={isSubmitting}
          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded text-gray-300 transition-colors"
        >
          + Add Story
        </button>
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 space-y-4">
        {cards.map((card, i) => (
          <UserStoryCard
            key={card.id}
            card={card}
            index={i}
            total={cards.length}
            isSubmitting={isSubmitting}
            onChange={updated => updateCard(card.id, updated)}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
      </div>

      {/* Submit bar */}
      <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-600">
          {charCount > 0 ? `${charCount} characters` : 'Empty'}
        </span>
        <button
          type="button"
          onClick={() => canSubmit && onSubmit(serialized)}
          disabled={!canSubmit}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded text-sm font-medium text-white transition-colors"
        >
          {isSubmitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
