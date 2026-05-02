import type { ReactNode } from 'react';
import MermaidDiagram from './MermaidDiagram';

interface DocumentModalProps {
  docType: string;
  content: string;
  onClose: () => void;
}

// Split content into markdown segments and mermaid blocks
function parseSegments(text: string): Array<{ type: 'markdown' | 'mermaid'; content: string }> {
  const segments: Array<{ type: 'markdown' | 'mermaid'; content: string }> = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mermaidRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'mermaid', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'markdown', content: text.slice(lastIndex) });
  }
  return segments;
}

function renderInline(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-gray-100 font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={key++} className="list-disc list-inside space-y-0.5 text-gray-300 mb-3">
        {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ul>
    );
    listItems = [];
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      flushList();
      nodes.push(
        <h1 key={key++} className="text-base font-bold text-white mb-3 mt-1">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      nodes.push(
        <h2 key={key++} className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-5 mb-1.5">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={key++} className="text-gray-300 mb-2 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return nodes;
}

const DOC_LABEL: Record<string, string> = {
  brief: 'Project Brief',
  prd: 'PRD',
  submission: 'My Submission',
};

export default function DocumentModal({ docType, content, onClose }: DocumentModalProps) {
  const isPlainText = docType === 'submission';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold text-white">
            {DOC_LABEL[docType] ?? docType}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {isPlainText ? (
            <pre className="whitespace-pre-wrap font-mono text-gray-200 leading-relaxed text-sm">
              {content}
            </pre>
          ) : (
            <div>
              {parseSegments(content).map((seg, i) =>
                seg.type === 'mermaid'
                  ? <MermaidDiagram key={i} code={seg.content} />
                  : <div key={i}>{renderMarkdown(seg.content)}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
