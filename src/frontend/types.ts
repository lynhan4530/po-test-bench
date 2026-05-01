export interface ChatMessage {
  id: string;
  role: 'user' | 'developer' | 'qa';
  content: string;
  streaming?: boolean;
}
