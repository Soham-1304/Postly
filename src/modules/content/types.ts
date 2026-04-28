/**
 * Content generation types
 */

export interface GenerateContentRequest {
  idea: string;
  post_type: string;
  platforms: string[];
  tone: string;
  language: string;
  model: string;
}

export interface PlatformContent {
  content: string;
  char_count: number;
  hashtags: string[];
}

export interface GeneratedContentResponse {
  generated: {
    [platform: string]: PlatformContent;
  };
  model_used: string;
  tokens_used: number;
}

export type SupportedModel = 'gemini' | 'openai' | 'anthropic';
