export interface Message {
  role: 'user' | 'developer' | 'qa' | 'system';
  content: string;
  timestamp: number;
}

export interface Blueprint {
  id: string;
  industry: string;
  companyType: string;
  companySize: string;
  product: string;
  stage: string;
  context: string;
}

export interface DocumentState {
  id: string;
  name: string;
  label: string;
  generatorInstruction: string;
}

export interface Trigger {
  id: string;
  format: 'email' | 'slack' | 'brief' | 'ticket';
  compatibleIndustries: string[];
  content: string;
  task: string;
}

export interface SessionState {
  sessionId: string;
  blueprint: Blueprint;
  documentState: DocumentState;
  trigger: Trigger;
  difficulty: 1 | 2 | 3 | 4;
  conversationHistory: Message[];
  generatedDocuments: Record<string, string>;
  personaSignoffs: {
    developer: boolean;
    qa: boolean;
  };
  phase: 'challenge' | 'review' | 'judging' | 'complete';
}

export interface GameMasterOutput {
  nextSpeaker: 'developer' | 'qa' | 'end' | 'wait';
  focus: string;
  tone: string;
}

export interface JudgeScore {
  dimension: string;
  score: number;
  feedback: string;
}

export interface JudgeFeedbackOutput {
  scores: JudgeScore[];
  overallScore: number;
  summary: string;
}
