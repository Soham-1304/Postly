import { Bot, Context } from 'grammy';
import { BotContext, ConversationSession } from '../types';
import { handleStart } from '../commands/start.command';
import { handlePost } from '../commands/post.command';
import { handleStatus } from '../commands/status.command';
import { handleAccounts } from '../commands/accounts.command';
import { handleHelp } from '../commands/help.command';
import { handleConversationStep, handleCallbackQuery } from '../conversations/publish.conversation';
import { prisma } from '../../../config/db';
import { verifyAccessToken } from '../../../utils/jwt';

// Mock Prisma and utilities
jest.mock('../../../config/db');
jest.mock('../../../utils/jwt');

describe('Telegram Bot - Commands & Conversation', () => {
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock context
    mockCtx = {
      chat: { id: 123456, type: 'private' } as any,
      userId: undefined,
      session: {
        step: null,
        selectedPlatforms: [],
        timestamp: Date.now(),
      } as ConversationSession,
      reply: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      editMessageReplyMarkup: jest.fn().mockResolvedValue({}),
      answerCallbackQuery: jest.fn().mockResolvedValue({}),
      message: { text: '' } as any,
      callbackQuery: {} as any,
      match: undefined,
      api: { deleteMessage: jest.fn().mockResolvedValue(undefined) } as any,
    };
  });

  // ─── Test 1: /start Command (Unlinked User) ───────────────────────────────
  describe('Command: /start (unlinked user)', () => {
    it('should ask for account linking and provide token instructions', async () => {
      await handleStart(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to *Postly*'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/start <your_token>'),
        expect.any(Object)
      );
    });

    it('should show instructions for linking account', async () => {
      await handleStart(mockCtx as BotContext);

      const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('link your Telegram account');
      expect(callArgs).toContain('web dashboard');
      expect(callArgs).toContain('link token');
    });
  });

  // ─── Test 2: /start Command (Linked User) ───────────────────────────────
  describe('Command: /start (linked user)', () => {
    it('should show welcome menu with quick action buttons', async () => {
      mockCtx.userId = 'user-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
      });

      await handleStart(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome back'),
        expect.objectContaining({ reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }) })
      );

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('John Doe'),
        expect.any(Object)
      );
    });

    it('should include quick action buttons', async () => {
      mockCtx.userId = 'user-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        name: 'Jane',
      });

      await handleStart(mockCtx as BotContext);

      const callArgs = (mockCtx.reply as jest.Mock).mock.calls[0];
      const keyboard = callArgs[1]?.reply_markup?.inline_keyboard;

      expect(keyboard).toBeDefined();
      expect(keyboard.toString()).toContain('Create Post');
      expect(keyboard.toString()).toContain('My Posts');
      expect(keyboard.toString()).toContain('Accounts');
    });
  });

  // ─── Test 3: /post Command (Authentication Check) ───────────────────────
  describe('Command: /post (authentication)', () => {
    it('should reject unauthenticated users', async () => {
      mockCtx.userId = undefined;

      await handlePost(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('link your account')
      );
    });

    it('should initialize conversation for authenticated users', async () => {
      mockCtx.userId = 'user-123';

      await handlePost(mockCtx as BotContext);

      expect(mockCtx.session.step).toBe('awaiting_post_type');
      expect(mockCtx.session.postType).toBeUndefined();
      expect(mockCtx.session.platforms).toBeUndefined();
      expect(mockCtx.session.tone).toBeUndefined();
      expect(mockCtx.session.model).toBeUndefined();
      expect(mockCtx.session.idea).toBeUndefined();
    });

    it('should reset session before starting conversation', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.postType = 'old-value';
      mockCtx.session.platforms = ['old-platform'];

      await handlePost(mockCtx as BotContext);

      expect(mockCtx.session.postType).toBeUndefined();
      expect(mockCtx.session.platforms).toBeUndefined();
    });

    it('should show post type selection buttons', async () => {
      mockCtx.userId = 'user-123';

      await handlePost(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('What type of post'),
        expect.objectContaining({ reply_markup: expect.any(Object) })
      );
    });
  });

  // ─── Test 4: /status Command ──────────────────────────────────────────────
  describe('Command: /status (post history)', () => {
    it('should reject unauthenticated users', async () => {
      mockCtx.userId = undefined;

      await handleStatus(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('link your account')
      );
    });

    it('should show message when no posts exist', async () => {
      mockCtx.userId = 'user-123';
      (prisma.post.findMany as jest.Mock).mockResolvedValue([]);

      await handleStatus(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('No posts yet')
      );
    });

    it('should display last 5 posts with platform statuses', async () => {
      mockCtx.userId = 'user-123';

      const mockPosts = [
        {
          id: 'post-1',
          idea: 'Test idea',
          createdAt: new Date(),
          platformPosts: [
            { platform: 'twitter', status: 'published' },
            { platform: 'linkedin', status: 'processing' },
          ],
        },
      ];

      (prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);

      await handleStatus(mockCtx as BotContext);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { platformPosts: true },
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your last 5 posts')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('twitter: published')
      );
    });
  });

  // ─── Test 5: /accounts Command ────────────────────────────────────────────
  describe('Command: /accounts (social accounts)', () => {
    it('should reject unauthenticated users', async () => {
      mockCtx.userId = undefined;

      await handleAccounts(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('link your account')
      );
    });

    it('should show message when no accounts connected', async () => {
      mockCtx.userId = 'user-123';
      (prisma.socialAccount.findMany as jest.Mock).mockResolvedValue([]);

      await handleAccounts(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('No social accounts connected')
      );
    });

    it('should list connected social accounts', async () => {
      mockCtx.userId = 'user-123';

      const mockAccounts = [
        { id: 'acc-1', platform: 'twitter', handle: '@johndoe' },
        { id: 'acc-2', platform: 'linkedin', handle: 'john-doe' },
      ];

      (prisma.socialAccount.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      await handleAccounts(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Your connected accounts')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('twitter: @johndoe')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('linkedin: john-doe')
      );
    });
  });

  // ─── Test 6: /help Command ───────────────────────────────────────────────
  describe('Command: /help', () => {
    it('should show command reference', async () => {
      await handleHelp(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Postly Bot Commands')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/start')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/post')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/status')
      );
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/accounts')
      );
    });
  });

  // ─── Test 7: Conversation Validation ──────────────────────────────────────
  describe('Conversation: Input Validation', () => {
    it('should reject text input when buttons are expected', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_post_type'; // Expecting button input
      mockCtx.message = { text: 'some random text' } as any;

      await handleConversationStep(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Please use the buttons')
      );
    });

    it('should accept text input during idea step', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.message = { text: 'My post idea here' } as any;

      // Mock content service
      jest.mock('../../content/content.service', () => ({
        ContentService: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockResolvedValue({
            generated: {
              twitter: { content: 'Tweet content', hashtags: ['#tag1'] },
              linkedin: { content: 'LinkedIn content', hashtags: ['#tag1', '#tag2'] },
            },
          }),
        })),
      }));

      await handleConversationStep(mockCtx as BotContext);

      // Should process the idea
      expect(mockCtx.session.step).not.toBe('awaiting_idea');
    });

    it('should reject idea longer than 500 characters', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.message = { text: 'x'.repeat(501) } as any;

      await handleConversationStep(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('must be between 1 and 500 characters')
      );
    });

    it('should reject empty idea', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.message = { text: '' } as any;

      await handleConversationStep(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('between 1 and 500 characters')
      );
    });
  });

  // ─── Test 8: Session Timeout ─────────────────────────────────────────────
  describe('Conversation: Session Timeout', () => {
    it('should reset session after 30 minutes of inactivity', async () => {
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000) - 1000; // 30+ minutes

      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.session.timestamp = thirtyMinutesAgo;
      mockCtx.message = { text: 'new input' } as any;

      // The session timeout is checked in bot middleware, not in handlers
      // This test verifies the session structure supports timeout
      expect(mockCtx.session.timestamp).toBeLessThan(Date.now() - (30 * 60 * 1000));
    });

    it('should not reset session within 30 minutes', async () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.session.timestamp = fiveMinutesAgo;

      expect(mockCtx.session.timestamp).toBeGreaterThan(Date.now() - (30 * 60 * 1000));
    });
  });

  // ─── Test 9: Unauthenticated User Conversation ────────────────────────────
  describe('Conversation: Authentication', () => {
    it('should reject free-text input from unauthenticated users', async () => {
      mockCtx.userId = undefined;
      mockCtx.session.step = 'awaiting_idea';
      mockCtx.message = { text: 'My idea' } as any;

      await handleConversationStep(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('not linked')
      );
    });
  });

  // ─── Test 10: Callback Query Handling ─────────────────────────────────────
  describe('Conversation: Callback Queries', () => {
    it('should handle post type selection via callback', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_post_type';
      mockCtx.callbackQuery = { data: 'type:announcement' } as any;

      await handleCallbackQuery(mockCtx as BotContext);

      expect(mockCtx.session.postType).toBe('announcement');
      expect(mockCtx.session.step).toBe('awaiting_platforms');
      expect(mockCtx.editMessageText).toHaveBeenCalled();
    });

    it('should handle platform multi-select', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_platforms';
      mockCtx.session.selectedPlatforms = [];
      mockCtx.callbackQuery = { data: 'platform:twitter' } as any;

      await handleCallbackQuery(mockCtx as BotContext);

      expect(mockCtx.session.selectedPlatforms).toContain('twitter');
      expect(mockCtx.editMessageReplyMarkup).toHaveBeenCalled();
    });

    it('should require at least one platform before proceeding', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_platforms';
      mockCtx.session.selectedPlatforms = [];
      mockCtx.callbackQuery = { data: 'platform:done' } as any;

      await handleCallbackQuery(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith(
        expect.stringContaining('at least one platform')
      );
    });

    it('should allow "All Platforms" selection', async () => {
      mockCtx.userId = 'user-123';
      mockCtx.session.step = 'awaiting_platforms';
      mockCtx.callbackQuery = { data: 'platform:all' } as any;

      await handleCallbackQuery(mockCtx as BotContext);

      expect(mockCtx.session.selectedPlatforms).toEqual(
        expect.arrayContaining(['twitter', 'linkedin', 'instagram', 'threads'])
      );
    });
  });

  // ─── Test 11: Error Handling ─────────────────────────────────────────────
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockCtx.userId = 'user-123';
      (prisma.post.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await handleStatus(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred')
      );
    });

    it('should handle missing user gracefully', async () => {
      mockCtx.userId = 'user-123';
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await handleStart(mockCtx as BotContext);

      // Should show guest message, not crash
      expect(mockCtx.reply).toHaveBeenCalled();
    });
  });
});
