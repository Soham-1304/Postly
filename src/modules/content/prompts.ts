/**
 * Platform-specific constraints and prompt builder
 */

interface PlatformSpec {
  charLimit: number | null;
  hashtagMin: number;
  hashtagMax: number;
  style: string;
}

const platformSpecs: Record<string, PlatformSpec> = {
  twitter: {
    charLimit: 280,
    hashtagMin: 2,
    hashtagMax: 3,
    style: 'Punchy, engaging, conversational opener'
  },
  linkedin: {
    charLimit: 1300,
    hashtagMin: 3,
    hashtagMax: 5,
    style: 'Professional, insightful, thought-leadership focused'
  },
  instagram: {
    charLimit: null,
    hashtagMin: 10,
    hashtagMax: 15,
    style: 'Emoji-friendly, visual storytelling, engaging caption'
  },
  threads: {
    charLimit: 500,
    hashtagMin: 2,
    hashtagMax: 3,
    style: 'Conversational, casual, community-focused'
  }
};

/**
 * Build system prompt for AI model based on selected platforms and preferences
 * Returns a prompt that instructs the model to generate content for ONLY the selected platforms
 * in a single response
 */
export function buildSystemPrompt(
  platforms: string[],
  tone: string,
  language: string,
  postType: string
): string {
  // Build platform constraints text for ONLY the selected platforms
  const platformConstraints = platforms
    .map((platform) => {
      const spec = platformSpecs[platform];
      if (!spec) return '';

      const charInfo = spec.charLimit
        ? `max ${spec.charLimit} characters`
        : 'no character limit';

      return `
**${platform.charAt(0).toUpperCase() + platform.slice(1)}:**
- ${charInfo}
- Include ${spec.hashtagMin}-${spec.hashtagMax} hashtags
- Style: ${spec.style}`;
    })
    .join('\n');

  // LinkedIn is ALWAYS professional (from BACKEND_INTERN_TASK.md)
  const toneNote =
    platforms.includes('linkedin')
      ? `The overall tone is "${tone}". However, LinkedIn content is ALWAYS professional and thought-leadership focused, regardless of the global tone setting.`
      : `The overall tone is "${tone}".`;

  // Build the full system prompt
  const systemPrompt = `You are an expert social media content creator specializing in platform-specific messaging.

Your task is to generate content for the following platforms: ${platforms.join(', ')}

**Tone:** ${toneNote}
**Language:** Generate content in ${language === 'en' ? 'English' : language}
**Post Type:** This is a ${postType} post

**Platform Constraints:**
${platformConstraints}

**Important Rules:**
1. Respect character limits strictly for Twitter and Threads
2. LinkedIn content must always be professional and insightful
3. Instagram content should be emoji-friendly and visual
4. Each platform gets its own unique, optimized message (do NOT copy-paste)
5. Include ${language === 'en' ? 'relevant' : 'culturally appropriate'} hashtags for each platform
6. Do NOT include hashtags in the content text — list them separately in the "hashtags" array

**Output Format:**
You MUST return ONLY valid JSON with no markdown code blocks, no explanations, no extra text.
The JSON structure MUST have exactly these keys for the selected platforms:
${platforms.map((p) => `- "${p}"`).join('\n')}

Each platform object MUST have:
- "content" (string): The post content
- "hashtags" (array of strings): List of hashtags

Remember:
- Return ONLY the JSON, nothing else
- Validate character counts before responding
- Make each platform's content unique and optimized
- Do not repeat content across platforms`;

  return systemPrompt;
}
