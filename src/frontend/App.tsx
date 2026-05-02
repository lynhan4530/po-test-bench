import { useState, useRef } from 'react';
import type { Trigger, Blueprint, DocumentState, JudgeFeedbackOutput } from '../types/session';
import type { ChatMessage } from './types';
import ContextPanel from './ContextPanel';
import GroupChat from './GroupChat';
import DocumentEditor from './DocumentEditor';
import DocumentModal from './DocumentModal';
import JudgeFeedback from './JudgeFeedback';
import MainMenu from './MainMenu';
import { loadHistory, upsertEntry, clearHistory } from './history';
import type { HistoryEntry } from './history';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

type Phase = 'challenge' | 'review' | 'judging' | 'complete';
type View = 'menu' | 'challenge';

export default function App() {
  const [view, setView] = useState<View>('menu');
  const [selectedDifficulty, setSelectedDifficulty] = useState<1 | 2 | 3 | 4>(1);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

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
  const [historyViewEntry, setHistoryViewEntry] = useState<HistoryEntry | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [isJudging, setIsJudging] = useState(false);

  const judgingStarted = useRef(false);

  function refreshHistory() {
    setHistory(loadHistory());
  }

  function resetChallengeState() {
    setMessages([]);
    setTyping(null);
    setGeneratedDocs({});
    setModalDoc(null);
    setJudgeResult(null);
    setSignoffs({ developer: false, qa: false });
    setPhase('challenge');
    judgingStarted.current = false;
  }

  async function startSession(difficulty: 1 | 2 | 3 | 4 = selectedDifficulty) {
    setIsStarting(true);
    resetChallengeState();

    try {
      const res = await fetch(`${API_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json() as {
        sessionId: string;
        trigger: Trigger;
        blueprint: Blueprint;
        documentState: DocumentState;
        phase: Phase;
        difficulty: 1 | 2 | 3 | 4;
      };
      setSessionId(data.sessionId);
      setTrigger(data.trigger);
      setBlueprint(data.blueprint);
      setDocumentState(data.documentState);
      setPhase(data.phase);

      upsertEntry({
        sessionId: data.sessionId,
        date: Date.now(),
        industry: data.blueprint.industry,
        companyType: data.blueprint.companyType,
        triggerTask: data.trigger.task.slice(0, 80),
        difficulty: data.difficulty,
        phase: 'challenge',
      });
      refreshHistory();

      setView('challenge');
    } catch (err) {
      console.error('Failed to start session:', err);
    } finally {
      setIsStarting(false);
    }
  }

  async function resumeSession(id: string) {
    setIsStarting(true);
    resetChallengeState();

    try {
      const res = await fetch(`${API_URL}/api/session/${id}`);
      if (res.status === 404) {
        upsertEntry({ sessionId: id, sessionExpired: true } as HistoryEntry & { sessionId: string });
        refreshHistory();
        setIsStarting(false);
        return;
      }
      const data = await res.json() as {
        sessionId: string;
        trigger: Trigger;
        blueprint: Blueprint;
        documentState: DocumentState;
        phase: Phase;
        difficulty: 1 | 2 | 3 | 4;
        generatedDocuments: Record<string, string>;
        personaSignoffs: { developer: boolean; qa: boolean };
      };
      setSessionId(data.sessionId);
      setTrigger(data.trigger);
      setBlueprint(data.blueprint);
      setDocumentState(data.documentState);
      setPhase(data.phase);
      setSignoffs(data.personaSignoffs);
      setGeneratedDocs(data.generatedDocuments);
      setView('challenge');
    } catch (err) {
      console.error('Resume failed:', err);
    } finally {
      setIsStarting(false);
    }
  }

  function goToMenu() {
    setView('menu');
    refreshHistory();
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
        if (sessionId) {
          upsertEntry({ sessionId, phase: 'review' });
          refreshHistory();
        }
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
      upsertEntry({
        sessionId: id,
        phase: 'complete',
        overallScore: data.overallScore,
        scores: data.scores,
        summary: data.summary,
      });
      refreshHistory();
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
            if (sessionId) {
              upsertEntry({ sessionId, phase: newPhase });
              refreshHistory();
            }
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

  // ── Main Menu ──────────────────────────────────────────────────────────────

  if (view === 'menu') {
    return (
      <>
        <MainMenu
          history={history}
          difficulty={selectedDifficulty}
          isStarting={isStarting}
          onDifficultyChange={setSelectedDifficulty}
          onStart={() => startSession(selectedDifficulty)}
          onResume={resumeSession}
          onViewResult={entry => setHistoryViewEntry(entry)}
          onClearHistory={() => { clearHistory(); refreshHistory(); }}
        />
        {historyViewEntry && historyViewEntry.scores && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Judge's Verdict</h2>
                  <p className="text-sm text-gray-400">Score: <span className="text-white font-semibold">{historyViewEntry.overallScore}/5</span></p>
                </div>
                <button
                  onClick={() => setHistoryViewEntry(null)}
                  className="text-gray-500 hover:text-gray-300 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              {historyViewEntry.summary && (
                <p className="text-sm text-gray-300 leading-relaxed">{historyViewEntry.summary}</p>
              )}
              <div className="space-y-3">
                {historyViewEntry.scores.map(s => (
                  <div key={s.dimension} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-white">{s.dimension}</span>
                      <span className="text-sm text-gray-300">{s.score}/5</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{s.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Challenge view ──────────────────────────────────────────────────────────

  const chatDisabled = phase === 'judging' || phase === 'complete' || isJudging;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={goToMenu}
            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Menu
          </button>
          <span className="font-bold text-base tracking-tight">PO Test Bench</span>
        </div>
        <div className="flex items-center gap-3">
          {blueprint && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {blueprint.industry} · {blueprint.companyType}
            </span>
          )}
          <button
            onClick={() => startSession(selectedDifficulty)}
            disabled={isStarting}
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded text-gray-200 transition-colors"
          >
            {isStarting ? 'Starting…' : 'New Challenge'}
          </button>
        </div>
      </header>

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
                <JudgeFeedback
                  feedback={judgeResult}
                  onNewChallenge={() => startSession(selectedDifficulty)}
                  onBackToMenu={goToMenu}
                />
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
