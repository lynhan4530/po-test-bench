import { useState } from 'react';
import type { Trigger } from '../types/session';

interface DocumentEditorProps {
  trigger: Trigger;
  isSubmitting: boolean;
  onSubmit: (content: string) => void;
}

const PLACEHOLDER = `As a [user type], I want [goal] so that [reason].

Acceptance Criteria:
- Given [context], when [action], then [outcome].
- Given [context], when [error condition], then [error outcome].

As a [user type], I want [goal] so that [reason].

Acceptance Criteria:
- Given [context], when [action], then [outcome].`;

export default function DocumentEditor({ trigger, isSubmitting, onSubmit }: DocumentEditorProps) {
  const [value, setValue] = useState('');
  const canSubmit = value.trim().length > 0 && !isSubmitting;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Task callout */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-800 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Your task</p>
        <p className="text-sm text-gray-200 leading-relaxed">{trigger.task}</p>
        <p className="text-xs text-gray-600 mt-2">
          Write your user stories and acceptance criteria below, then submit for review.
        </p>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 px-6 pt-4 pb-2">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          disabled={isSubmitting}
          placeholder={PLACEHOLDER}
          className="w-full h-full resize-none bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-700 font-mono leading-relaxed focus:outline-none focus:border-blue-600 disabled:opacity-50"
        />
      </div>

      {/* Submit bar */}
      <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-xs text-gray-600">
          {value.trim().length > 0 ? `${value.trim().split(/\s+/).length} words` : 'Empty'}
        </span>
        <button
          onClick={() => canSubmit && onSubmit(value.trim())}
          disabled={!canSubmit}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded text-sm font-medium text-white transition-colors"
        >
          {isSubmitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
