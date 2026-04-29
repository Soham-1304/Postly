import { InlineKeyboard } from 'grammy';
import { BotContext } from '../types';
import { ContentService } from '../../content/content.service';
import { PostsService } from '../../posts/posts.service';

const contentService = new ContentService();
const postsService = new PostsService();

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  threads: 'Threads',
};

const ALL_PLATFORMS = ['twitter', 'linkedin', 'instagram', 'threads'];

// ─── Keyboard Builders ────────────────────────────────────────────────────────

function buildPlatformKeyboard(selected: string[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  ALL_PLATFORMS.forEach((p, i) => {
    const isSelected = selected.includes(p);
    const label = `${isSelected ? '✓ ' : ''}${PLATFORM_LABELS[p]}`;
    keyboard.text(label, `platform:${p}`);
    if (i % 2 !== 0) keyboard.row();
  });
  keyboard.row().text('Select All', 'platform:all').row();
  keyboard.text('Continue →', 'platform:done');
  return keyboard;
}

function buildToneKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Professional', 'tone:professional').text('Casual', 'tone:casual').row()
    .text('Witty', 'tone:witty').text('Authoritative', 'tone:authoritative').row()
    .text('Friendly', 'tone:friendly');
}

function buildModelKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Gemini 3.1 Flash', 'model:gemini').row()
    .text('GPT-4o (OpenAI)', 'model:openai').row()
    .text('Claude Sonnet (Anthropic)', 'model:anthropic');
}

function buildConfirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✓ Post Now', 'confirm:yes')
    .text('✎ Edit Idea', 'confirm:edit')
    .text('✕ Cancel', 'confirm:cancel');
}

// ─── Callback Query Handler (button taps) ────────────────────────────────────

export const handleCallbackQuery = async (ctx: BotContext) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  await ctx.answerCallbackQuery(); // dismiss loading spinner

  // Menu shortcuts from /start
  if (data === 'menu:post') return handlePostStart(ctx);
  if (data === 'menu:status') {
    const { handleStatus } = await import('../commands/status.command');
    return handleStatus(ctx);
  }
  if (data === 'menu:accounts') {
    const { handleAccounts } = await import('../commands/accounts.command');
    return handleAccounts(ctx);
  }

  // Post type selection
  if (data.startsWith('type:')) {
    const postType = data.split(':')[1];
    ctx.session.postType = postType;
    ctx.session.selectedPlatforms = [];
    ctx.session.step = 'awaiting_platforms';

    return ctx.editMessageText(
      `Post type: *${postType}*\n\nWhich platforms should I post to?\n_(tap to toggle, then press Continue)_`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildPlatformKeyboard([]),
      }
    );
  }

  // Platform multi-select toggle
  if (data.startsWith('platform:') && ctx.session.step === 'awaiting_platforms') {
    const value = data.split(':')[1];
    let selected = ctx.session.selectedPlatforms || [];

    if (value === 'all') {
      selected = [...ALL_PLATFORMS];
    } else if (value === 'done') {
      if (selected.length === 0) {
        return ctx.answerCallbackQuery('⚠️ Pick at least one platform!');
      }
      ctx.session.platforms = selected;
      ctx.session.step = 'awaiting_tone';

      return ctx.editMessageText(
        `Platforms: *${selected.map(p => PLATFORM_LABELS[p]).join(', ')}*\n\nWhat tone should the content have?`,
        {
          parse_mode: 'Markdown',
          reply_markup: buildToneKeyboard(),
        }
      );
    } else {
      // toggle
      if (selected.includes(value)) {
        selected = selected.filter(p => p !== value);
      } else {
        selected.push(value);
      }
    }

    ctx.session.selectedPlatforms = selected;
    return ctx.editMessageReplyMarkup({
      reply_markup: buildPlatformKeyboard(selected),
    });
  }

  // Tone selection
  if (data.startsWith('tone:') && ctx.session.step === 'awaiting_tone') {
    const tone = data.split(':')[1];
    ctx.session.tone = tone;
    ctx.session.step = 'awaiting_model';

    return ctx.editMessageText(
      `Tone: *${tone}*\n\nWhich AI model do you want to use?`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildModelKeyboard(),
      }
    );
  }

  // Model selection
  if (data.startsWith('model:') && ctx.session.step === 'awaiting_model') {
    const model = data.split(':')[1] as 'gemini' | 'openai' | 'anthropic';
    ctx.session.model = model;
    ctx.session.step = 'awaiting_idea';

    return ctx.editMessageText(
      `Model: *${model}*\n\nTell me your idea or core message.\n_(keep it brief, max 500 chars)_`,
      { parse_mode: 'Markdown' }
    );
  }

  // Confirm / Edit / Cancel
  if (data.startsWith('confirm:') && ctx.session.step === 'preview') {
    const action = data.split(':')[1];

    if (action === 'yes') return handleConfirm(ctx);
    if (action === 'edit') {
      ctx.session.step = 'awaiting_idea';
      return ctx.editMessageText(
        'Let\'s rewrite the idea.\n\nTell me your new idea or core message _(max 500 chars)_:',
        { parse_mode: 'Markdown' }
      );
    }
    if (action === 'cancel') {
      ctx.session.step = null;
      return ctx.editMessageText('Cancelled. Type /post whenever you\'re ready.');
    }
  }
};

// ─── Text Message Handler (for idea input) ───────────────────────────────────

export const handleConversationStep = async (ctx: BotContext) => {
  if (!ctx.userId) {
    return ctx.reply('❌ Your account is not linked. Use /start to get your Chat ID and link it.');
  }

  ctx.session.timestamp = Date.now();
  const text = ctx.message?.text?.trim() || '';

  // Only handle free text during idea step
  if (ctx.session.step === 'awaiting_idea') {
    return handleIdeaInput(ctx, text);
  }

  // For any other step where we expect a button, nudge the user
  if (ctx.session.step && ctx.session.step !== null) {
    return ctx.reply('👆 Please use the buttons above to continue.');
  }
};

// ─── Step Handlers ────────────────────────────────────────────────────────────

export const handlePostStart = async (ctx: BotContext) => {
  if (!ctx.userId) {
    return ctx.reply('❌ Please link your account first. Use /start to get started.');
  }

  ctx.session.step = 'awaiting_post_type';
  ctx.session.postType = undefined;
  ctx.session.platforms = undefined;
  ctx.session.selectedPlatforms = [];
  ctx.session.tone = undefined;
  ctx.session.model = undefined;
  ctx.session.idea = undefined;
  ctx.session.generatedContent = undefined;
  ctx.session.timestamp = Date.now();

  const keyboard = new InlineKeyboard()
    .text('Announcement', 'type:announcement').text('Thread', 'type:thread').row()
    .text('Story', 'type:story').text('Promotional', 'type:promotional').row()
    .text('Educational', 'type:educational').text('Opinion', 'type:opinion');

  return ctx.reply('Let\'s create a post.\n\nWhat type of post is this?', {
    reply_markup: keyboard,
  });
};

async function handleIdeaInput(ctx: BotContext, idea: string) {
  if (!idea || idea.length > 500) {
    return ctx.reply('❌ Idea must be between 1 and 500 characters. Try again:');
  }

  ctx.session.idea = idea;

  const thinkingMsg = await ctx.reply('Generating your content...');

  try {
    const result = await contentService.generateContent({
      idea,
      post_type: ctx.session.postType!,
      platforms: ctx.session.platforms!,
      tone: ctx.session.tone!,
      language: 'en',
      model: ctx.session.model!,
      userId: ctx.userId!,
    });

    ctx.session.generatedContent = result.generated;
    ctx.session.step = 'preview';

    // Build preview text
    const preview = ctx.session.platforms!.map((platform) => {
      const data = result.generated[platform];
      if (!data) return '';
      const charCount = data.content.length;
      const snippet = data.content.length > 200
        ? data.content.substring(0, 200) + '...'
        : data.content;
      return `${PLATFORM_LABELS[platform]} _(${charCount} chars)_:\n${snippet}`;
    }).filter(Boolean).join('\n\n─────────────────\n\n');

    // Delete the "generating" message
    await ctx.api.deleteMessage(ctx.chat!.id, thinkingMsg.message_id).catch(() => {});

    return ctx.reply(
      `*Here's your content preview:*\n\n${preview}\n\n─────────────────\n\nConfirm and post?`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildConfirmKeyboard(),
      }
    );
  } catch (error) {
    ctx.session.step = null;
    await ctx.api.deleteMessage(ctx.chat!.id, thinkingMsg.message_id).catch(() => {});
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Content generation failed:', error);
    return ctx.reply(
      `Content generation failed: ${msg}\n\nType /post to try again.`
    );
  }
}

async function handleConfirm(ctx: BotContext) {
  try {
    await ctx.editMessageText('Queuing your posts...');

    await postsService.publishPost(ctx.userId!, {
      idea: ctx.session.idea!,
      post_type: ctx.session.postType!,
      platforms: ctx.session.platforms!,
      tone: ctx.session.tone!,
      language: 'en',
      model: ctx.session.model!,
    });

    const platformList = ctx.session.platforms!
      .map(p => `• ${PLATFORM_LABELS[p]}`)
      .join('\n');

    ctx.session.step = null;

    return ctx.editMessageText(
      `*Posts queued successfully!*\n\nPublishing to:\n${platformList}\n\nType /status to track your posts.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    ctx.session.step = null;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to queue post:', error);
    return ctx.editMessageText(
      `Failed to queue post: ${msg}\n\nType /post to try again.`
    );
  }
}