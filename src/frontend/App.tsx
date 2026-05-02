import { useState, useEffect, useRef } from 'react';
import type { Trigger, Blueprint, DocumentState, JudgeFeedbackOutput } from '../types/session';
import type { ChatMessage } from './types';
import ContextPanel from './ContextPanel';
import GroupChat from './GroupChat';
import DocumentEditor from './DocumentEditor';
import DocumentModal from './DocumentModal';
import JudgeFeedback from './JudgeFeedback';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

type Phase = 'challenge' | 'review' | 'judging' | 'complete';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [documentState, setDocumentState] = useState<DocumentState | null>(null);
  const [phase, setPhase] = useState<Phase>('challenge');
  const [signoffs, setSignoffs] = useState({ developer: false, qa: false });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<{ persona: 'developer' | 'qa' } | null>(null);

  const [generatedDocs, setGeneratedDocs] = useState<Record<string, string>>({});
  const [modalDoc, setModalDoc] = useState<{ type: string; content: string } | null>(null);

  const [judgeResult, setJudgeResult] = useState<JudgeFeedbackOutput | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isJudging, setIsJudging] = useState(false);

  const judgingStarted = useRef(false);

  useEffect(() => {
    startSession();
  }, []);

  async function startSession() {
    setIsStarting(true);
    setMessages([]);
    setTyping(null);
    setGeneratedDocs({});
    setModalDoc(null);
    setJudgeResult(null);
    setSignoffs({ developer: false, qa: false });
    setPhase('challenge');
    judgingStarted.current = false;

    try {
      const res = await fetch(`${API_URL}/api/session/start`, { method: 'POST' });
      const data = await res.json() as {
        sessionId: string;
        trigger: Trigger;
        blueprint: Blueprint;
        documentState: DocumentState;
        phase: Phase;
      };
      setSessionId(data.sessionId);
      setTrigger(data.trigger);
      setBlueprint(data.blueprint);
      setDocumentState(data.documentState);
      setPhase(data.phase);
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  }

  async function submitDocument(content: string) {
    if (!sessionId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        setGeneratedDocs(prev => ({ ...prev, submission: content }));
      }
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function triggerJudge(id: string) {
    if (judgingStarted.current) return;
    judgingStarted.current = true;
    setIsJudging(true);
    try {
      const res = await fetch(`${API_URL}/api/session/${id}/judge`, { method: 'POST' });
      const data = await res.json() as JudgeFeedbackOutput;
      setJudgeResult(data);
      setPhase('complete');
    } catch (err) {
      console.error('Judge call failed:', err);
    } finally {
      setIsJudging(false);
    }
  }

  async function sendMessage(content: string) {
    if (!sessionId || isSending) return;
    setIsSending(true);

    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content }]);

    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let streamingId: string | null = null;
      let currentPersona: 'developer' | 'qa' | null = null;
      let hasStartedMessage = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === 'typing') {
            currentPersona = event.persona as 'developer' | 'qa';
            streamingId = crypto.randomUUID();
            hasStartedMessage = false;
            setTyping({ persona: currentPersona });
          } else if (event.type === 'text') {
            const text = event.text as string;
            if (!hasStartedMessage && streamingId && currentPersona) {
              hasStartedMessage = true;
              setTyping(null);
              const msgId = streamingId;
              const role = currentPersona;
              setMessages(prev => [...prev, { id: msgId, role, content: text, streaming: true }]);
            } else if (streamingId) {
              const msgId = streamingId;
              setMessages(prev =>
                prev.map(m => m.id === msgId ? { ...m, content: m.content + text } : m)
              );
            }
          } else if (event.type === 'done') {
            setTyping(null);
            if (streamingId) {
              const msgId = streamingId;
              setMessages(prev =>
                prev.map(m => m.id === msgId ? { ...m, streaming: false } : m)
              );
            }
            const newPhase = event.phase as Phase;
            setPhase(newPhase);
            setSignoffs(event.signoffs as { developer: boolean; qa: boolean });
            if (newPhase === 'judging') {
              triggerJudge(sessionId);
            }
          } else if (event.type === 'phase') {
            const newPhase = event.phase as Phase;
            setPhase(newPhase);
            if (newPhase === 'judging') {
              triggerJudge(sessionId);
            }
          } else if (event.type === 'error') {
            console.error('SSE error:', event.message);
          }
        }
      }
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setIsSending(false);
    }
  }

  async function requestDocument(docType: string) {
    if (!sessionId) return;

    if (generatedDocs[docType]) {
      setModalDoc({ type: docType, content: generatedDocs[docType] });
      return;
    }

    setIsLoadingDoc(true);
    try {
      const res = await fetch(`${API_URL}/api/session/${sessionId}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType }),
      });
      const data = await res.json() as { content: string };
      setGeneratedDocs(prev => ({ ...prev, [docType]: data.content }));
      setModalDoc({ type: docType, content: data.content });
    } catch (err) {
      console.error('Document generation failed:', err);
    } finally {
      setIsLoadingDoc(false);
    }
  }

  const chatDisabled = phase === 'judging' || phase === 'complete' || isJudging;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-base tracking-tight">PO Test Bench</span>
        <div className="flex items-center gap-3">
          {blueprint && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {blueprint.industry} · {blueprint.companyType}
            </span>
          )}
          <button
            onClick={startSession}
            disabled={isStarting}
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-gray-200 transition-colors"
          >
            {isStarting ? 'Starting…' : 'New Challenge'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {isStarting && (
          <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
            Loading challenge…
          </div>
        )}

        {!isStarting && trigger && documentState && (
          <>
            <ContextPanel
              trigger={trigger}
              documentState={documentState}
              generatedDocs={generatedDocs}
              signoffs={signoffs}
              isLoadingDoc={isLoadingDoc}
              onRequestDoc={requestDocument}
            />

            <main className="flex flex-col flex-1 min-h-0">
              {!generatedDocs['submission'] ? (
                <DocumentEditor
                  trigger={trigger}
                  isSubmitting={isSubmitting}
                  onSubmit={submitDocument}
                />
              ) : phase === 'complete' && judgeResult ? (
                <JudgeFeedback feedback={judgeResult} onNewChallenge={startSession} />
              ) : isJudging ? (
                <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
                  <p className="text-sm">Judge is reviewing the session…</p>
                </div>
              ) : (
                <GroupChat
                  messages={messages}
                  typing={typing}
                  isSending={isSending}
                  disabled={chatDisabled}
                  onSend={sendMessage}
                />
              )}
            </main>
          </>
        )}
      </div>

      {/* Document modal */}
      {modalDoc && (
        <DocumentModal
          docType={modalDoc.type}
          content={modalDoc.content}
          onClose={() => setModalDoc(null)}
        />
      )}
    </div>
  );
}
