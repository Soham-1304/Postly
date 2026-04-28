import { Context } from 'grammy';

export interface ConversationSession {
  step:
    | 'awaiting_post_type'
    | 'awaiting_platforms'
    | 'awaiting_tone'
    | 'awaiting_model'
    | 'awaiting_idea'
    | 'preview'
    | 'confirming'
    | null;
  postType?: string;
  platforms?: string[];
  selectedPlatforms?: string[]; // tracks multi-select toggle state
  tone?: string;
  model?: 'gemini' | 'openai' | 'anthropic';
  idea?: string;
  generatedContent?: Record<string, { content: string; hashtags?: string[] }>;
  previewMessageId?: number; // to edit preview message
  timestamp: number;
}

export interface BotContext extends Context {
  session: ConversationSession;
  userId?: string;
}