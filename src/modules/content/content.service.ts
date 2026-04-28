import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../../config/db';
import { decrypt } from '../../utils/crypto';
import { env } from '../../config/env';
import { buildSystemPrompt } from './prompts';
import { GeneratedContentResponse, SupportedModel } from './types';

export class ContentService {
  /**
   * Generate platform-specific content using selected AI model
   * Supports: Gemini (working), OpenAI (code provided), Anthropic (code provided)
   */
  async generateContent(data: {
    idea: string;
    post_type: string;
    platforms: string[];
    tone: string;
    language: string;
    model: SupportedModel;
    userId: string;
  }): Promise<GeneratedContentResponse> {
    const { idea, post_type, platforms, tone, language, model, userId } = data;

    // Build system prompt for ONLY the selected platforms
    const systemPrompt = buildSystemPrompt(platforms, tone, language, post_type);

    // Route to appropriate AI provider
    let response: GeneratedContentResponse;

    if (model === 'gemini') {
      response = await this.generateWithGemini(
        systemPrompt,
        idea,
        platforms,
        userId
      );
    } else if (model === 'openai') {
      response = await this.generateWithOpenAI(
        systemPrompt,
        idea,
        platforms,
        userId
      );
    } else if (model === 'anthropic') {
      response = await this.generateWithAnthropic(
        systemPrompt,
        idea,
        platforms,
        userId
      );
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    return response;
  }

  /**
   * Generate content using Gemini (gemini-2.0-flash-lite-preview)
   * This is the primary working implementation
   */
  private async generateWithGemini(
    systemPrompt: string,
    idea: string,
    platforms: string[],
    userId: string
  ): Promise<GeneratedContentResponse> {
    try {
      // Initialize Gemini client with API key from env
      const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = client.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        systemInstruction: systemPrompt
      });

      // Call Gemini with user idea
      const response = await model.generateContent(
        `Generate social media content for this idea: "${idea}"\n\nReturn ONLY valid JSON with no code blocks or explanations.`
      );

      // Extract text response
      const responseText = response.response?.text();
      if (!responseText) {
        throw new Error('Invalid response from Gemini: no text content');
      }

      const trimmedText = responseText.trim();

      // Parse JSON response
      let parsed: { [key: string]: { content: string; hashtags: string[] } };
      try {
        // Remove markdown code blocks if present
        const cleanedText = trimmedText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(
          `Failed to parse Gemini response as JSON: ${trimmedText.substring(0, 100)}`
        );
      }

      // Validate and format response
      const generated: { [platform: string]: any } = {};
      for (const platform of platforms) {
        const platformData = parsed[platform];
        if (!platformData) {
          throw new Error(`Missing ${platform} in AI response`);
        }

        if (!platformData.content || typeof platformData.content !== 'string') {
          throw new Error(`Invalid content for ${platform}`);
        }

        if (
          !Array.isArray(platformData.hashtags) ||
          platformData.hashtags.some((tag: any) => typeof tag !== 'string')
        ) {
          throw new Error(`Invalid hashtags for ${platform}`);
        }

        const charCount = platformData.content.length;

        // Validate char limits for Twitter and Threads (hard limits)
        if (platform === 'twitter' && charCount > 280) {
          throw new Error(
            `Twitter content exceeds 280 char limit (got ${charCount})`
          );
        }
        if (platform === 'threads' && charCount > 500) {
          throw new Error(
            `Threads content exceeds 500 char limit (got ${charCount})`
          );
        }

        // Validate hashtag counts
        const hashtagMin =
          platform === 'instagram'
            ? 10
            : platform === 'linkedin'
              ? 3
              : 2;
        const hashtagMax =
          platform === 'instagram'
            ? 15
            : platform === 'linkedin'
              ? 5
              : 3;

        if (
          platformData.hashtags.length < hashtagMin ||
          platformData.hashtags.length > hashtagMax
        ) {
          throw new Error(
            `${platform} hashtag count out of range (got ${platformData.hashtags.length}, expected ${hashtagMin}-${hashtagMax})`
          );
        }

        generated[platform] = {
          content: platformData.content,
          char_count: charCount,
          hashtags: platformData.hashtags
        };
      }

      // Get token count (fallback to 0 if not available)
      const tokenCount = response.response?.usageMetadata?.totalTokenCount || 0;

      return {
        generated,
        model_used: 'gemini-3.1-flash-lite-preview',
        tokens_used: tokenCount
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Gemini API error');
    }
  }

  /**
   * Generate content using OpenAI (GPT-4o)
   * Requires user's OpenAI API key from ai_keys table
   */
  private async generateWithOpenAI(
    systemPrompt: string,
    idea: string,
    platforms: string[],
    userId: string
  ): Promise<GeneratedContentResponse> {
    try {
      // Fetch user's OpenAI key from aiKeys table
      const aiKeys = await prisma.aiKeys.findUnique({ where: { userId } });

      if (!aiKeys?.openaiKeyEnc) {
        throw new Error(
          'OpenAI API key not configured. Please add your key in settings.'
        );
      }

      // Decrypt the key
      let openaiKey: string;
      try {
        openaiKey = decrypt(aiKeys.openaiKeyEnc);
      } catch (decryptError) {
        throw new Error('Failed to decrypt OpenAI API key');
      }

      // Import OpenAI SDK dynamically
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: openaiKey });

      // Call OpenAI with system prompt and user idea
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Generate social media content for this idea: "${idea}"\n\nReturn ONLY valid JSON with no code blocks or explanations.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      // Extract text response
      const textContent = response.choices[0]?.message?.content;
      if (!textContent) {
        throw new Error('Invalid response from OpenAI: no text content');
      }

      // Parse JSON response
      let parsed: { [key: string]: { content: string; hashtags: string[] } };
      try {
        const cleanedText = textContent
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(
          `Failed to parse OpenAI response as JSON: ${textContent.substring(0, 100)}`
        );
      }

      // Validate and format response (same as Gemini)
      const generated: { [platform: string]: any } = {};
      for (const platform of platforms) {
        const platformData = parsed[platform];
        if (!platformData) {
          throw new Error(`Missing ${platform} in AI response`);
        }

        if (!platformData.content || typeof platformData.content !== 'string') {
          throw new Error(`Invalid content for ${platform}`);
        }

        if (
          !Array.isArray(platformData.hashtags) ||
          platformData.hashtags.some((tag: any) => typeof tag !== 'string')
        ) {
          throw new Error(`Invalid hashtags for ${platform}`);
        }

        const charCount = platformData.content.length;

        // Validate char limits
        if (platform === 'twitter' && charCount > 280) {
          throw new Error(
            `Twitter content exceeds 280 char limit (got ${charCount})`
          );
        }
        if (platform === 'threads' && charCount > 500) {
          throw new Error(
            `Threads content exceeds 500 char limit (got ${charCount})`
          );
        }

        // Validate hashtag counts
        const hashtagMin =
          platform === 'instagram'
            ? 10
            : platform === 'linkedin'
              ? 3
              : 2;
        const hashtagMax =
          platform === 'instagram'
            ? 15
            : platform === 'linkedin'
              ? 5
              : 3;

        if (
          platformData.hashtags.length < hashtagMin ||
          platformData.hashtags.length > hashtagMax
        ) {
          throw new Error(
            `${platform} hashtag count out of range (got ${platformData.hashtags.length}, expected ${hashtagMin}-${hashtagMax})`
          );
        }

        generated[platform] = {
          content: platformData.content,
          char_count: charCount,
          hashtags: platformData.hashtags
        };
      }

      return {
        generated,
        model_used: 'gpt-4o',
        tokens_used: response.usage?.total_tokens || 0
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('OpenAI API error');
    }
  }

  /**
   * Generate content using Anthropic (Claude Sonnet)
   * Requires user's Anthropic API key from ai_keys table
   */
  private async generateWithAnthropic(
    systemPrompt: string,
    idea: string,
    platforms: string[],
    userId: string
  ): Promise<GeneratedContentResponse> {
    try {
      // Fetch user's Anthropic key from aiKeys table
      const aiKeys = await prisma.aiKeys.findUnique({ where: { userId } });

      if (!aiKeys?.anthropicKeyEnc) {
        throw new Error(
          'Anthropic API key not configured. Please add your key in settings.'
        );
      }

      // Decrypt the key
      let anthropicKey: string;
      try {
        anthropicKey = decrypt(aiKeys.anthropicKeyEnc);
      } catch (decryptError) {
        throw new Error('Failed to decrypt Anthropic API key');
      }

      // Import Anthropic SDK dynamically
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey });

      // Call Anthropic with system prompt and user idea
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate social media content for this idea: "${idea}"\n\nReturn ONLY valid JSON with no code blocks or explanations.`
          }
        ]
      });

      // Extract text response
      const textContent = response.content[0];
      if (textContent.type !== 'text') {
        throw new Error('Invalid response from Anthropic: no text content');
      }

      const responseText = textContent.text.trim();

      // Parse JSON response
      let parsed: { [key: string]: { content: string; hashtags: string[] } };
      try {
        const cleanedText = responseText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        parsed = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(
          `Failed to parse Anthropic response as JSON: ${responseText.substring(0, 100)}`
        );
      }

      // Validate and format response (same as others)
      const generated: { [platform: string]: any } = {};
      for (const platform of platforms) {
        const platformData = parsed[platform];
        if (!platformData) {
          throw new Error(`Missing ${platform} in AI response`);
        }

        if (!platformData.content || typeof platformData.content !== 'string') {
          throw new Error(`Invalid content for ${platform}`);
        }

        if (
          !Array.isArray(platformData.hashtags) ||
          platformData.hashtags.some((tag: any) => typeof tag !== 'string')
        ) {
          throw new Error(`Invalid hashtags for ${platform}`);
        }

        const charCount = platformData.content.length;

        // Validate char limits
        if (platform === 'twitter' && charCount > 280) {
          throw new Error(
            `Twitter content exceeds 280 char limit (got ${charCount})`
          );
        }
        if (platform === 'threads' && charCount > 500) {
          throw new Error(
            `Threads content exceeds 500 char limit (got ${charCount})`
          );
        }

        // Validate hashtag counts
        const hashtagMin =
          platform === 'instagram'
            ? 10
            : platform === 'linkedin'
              ? 3
              : 2;
        const hashtagMax =
          platform === 'instagram'
            ? 15
            : platform === 'linkedin'
              ? 5
              : 3;

        if (
          platformData.hashtags.length < hashtagMin ||
          platformData.hashtags.length > hashtagMax
        ) {
          throw new Error(
            `${platform} hashtag count out of range (got ${platformData.hashtags.length}, expected ${hashtagMin}-${hashtagMax})`
          );
        }

        generated[platform] = {
          content: platformData.content,
          char_count: charCount,
          hashtags: platformData.hashtags
        };
      }

      return {
        generated,
        model_used: 'claude-sonnet-4-5-20250514',
        tokens_used: response.usage?.input_tokens + response.usage?.output_tokens || 0
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Anthropic API error');
    }
  }
}
