import type { Trigger, DocumentState } from '../types/session';

interface ContextPanelProps {
  trigger: Trigger;
  documentState: DocumentState;
  generatedDocs: Record<string, string>;
  signoffs: { developer: boolean; qa: boolean };
  isLoadingDoc: boolean;
  onRequestDoc: (docType: string) => void;
}

const FORMAT_LABEL: Record<string, string> = {
  email: 'Email',
  slack: 'Slack message',
  brief: 'Project brief',
  ticket: 'Ticket',
};

const DOC_BUTTONS: { docType: string; label: string }[] = [
  { docType: 'brief', label: 'View Brief' },
  { docType: 'prd', label: 'View PRD' },
];

export default function ContextPanel({
  trigger,
  documentState,
  generatedDocs,
  signoffs,
  isLoadingDoc,
  onRequestDoc,
}: ContextPanelProps) {
  return (
    <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
      {/* Trigger label */}
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {FORMAT_LABEL[trigger.format] ?? trigger.format}
        </p>
      </div>

      {/* Trigger content + task */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {trigger.content}
        </p>
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Your task
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{trigger.task}</p>
        </div>
      </div>

      {/* Document buttons */}
      <div className="px-4 py-3 border-t border-gray-800 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Documents · {documentState.label}
        </p>
        {generatedDocs['submission'] && (
          <button
            onClick={() => onRequestDoc('submission')}
            className="w-full text-sm text-left px-3 py-1.5 rounded bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 transition-colors"
          >
            View My Submission
          </button>
        )}
        {DOC_BUTTONS.map(({ docType, label }) => (
          <button
            key={docType}
            onClick={() => onRequestDoc(docType)}
            disabled={isLoadingDoc}
            className="w-full text-sm text-left px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-50 transition-colors"
          >
            {isLoadingDoc && !generatedDocs[docType] ? 'Loading…' : label}
          </button>
        ))}
      </div>

      {/* Signoff status */}
      <div className="px-4 py-3 border-t border-gray-800 space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sign-offs</p>
        {(['developer', 'qa'] as const).map(persona => (
          <div key={persona} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                signoffs[persona] ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            />
            <span className="text-sm text-gray-400">{persona === 'developer' ? 'Alex' : 'Jordan'}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
