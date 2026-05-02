import { useEffect, useRef } from 'react';
import type { ChatMessage } from './types';
import TypingIndicator from './TypingIndicator';

interface GroupChatProps {
  messages: ChatMessage[];
  typing: { persona: 'developer' | 'qa' } | null;
  isSending: boolean;
  disabled: boolean;
  onSend: (content: string) => void;
  storyRefs?: string[];
}

const ROLE_LABEL: Record<string, string> = {
  user: 'You',
  developer: 'Developer',
  qa: 'QA',
};

const BUBBLE_CLASS: Record<string, string> = {
  user: 'bg-blue-900/50 text-blue-100',
  developer: 'bg-emerald-900/40 text-emerald-100',
  qa: 'bg-purple-900/40 text-purple-100',
};

const NAME_CLASS: Record<string, string> = {
  user: 'text-blue-400',
  developer: 'text-emerald-400',
  qa: 'text-purple-400',
};

export default function GroupChat({ messages, typing, isSending, disabled, onSend, storyRefs }: GroupChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function handleSend() {
    const val = inputRef.current?.value.trim();
    if (!val || isSending || disabled) return;
    onSend(val);
    if (inputRef.current) inputRef.current.value = '';
  }

  function insertRef(ref: string) {
    if (!inputRef.current) return;
    inputRef.current.value = inputRef.current.value + ` [${ref}] `;
    inputRef.current.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-600 text-sm text-center mt-10">
            Your submission is under review. The team will respond shortly.
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className={`text-xs font-semibold mb-0.5 ${NAME_CLASS[msg.role]}`}>
              {ROLE_LABEL[msg.role]}
            </span>
            <div
              className={`max-w-prose text-sm leading-relaxed rounded-lg px-3 py-2 ${BUBBLE_CLASS[msg.role]} ${
                msg.streaming ? 'border-r-2 border-white/20' : ''
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex flex-col items-start">
            <TypingIndicator persona={typing.persona} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pt-3 pb-3 border-t border-gray-800 space-y-2">
        {storyRefs && storyRefs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-600">Reference:</span>
            {storyRefs.map(ref => (
              <button
                key={ref}
                type="button"
                onClick={() => insertRef(ref)}
                className="text-xs px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-blue-400 font-mono transition-colors"
              >
                {ref}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
        <textarea
          ref={inputRef}
          rows={2}
          disabled={disabled || isSending}
          onKeyDown={handleKeyDown}
          placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-600 disabled:opacity-40"
        />
        <button
          onClick={handleSend}
          disabled={disabled || isSending}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded text-sm font-medium text-white transition-colors"
        >
          {isSending ? '…' : 'Send'}
        </button>
        </div>
      </div>
    </div>
  );
}
