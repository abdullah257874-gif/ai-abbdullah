import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  getResolvedModel,
  isGeminiConfigured,
  normalizeGeminiError,
  runChatCompletion,
  runImageAnalysis,
  runSummarization,
  runToolGeneration,
  runTranslation,
  type ChatTurnInput,
} from './server/gemini.ts';
import {
  attachOptionalAuth,
  createRateLimiter,
  isValidEmail,
  requireAdmin,
  requireAuth,
  securityHeadersAndCors,
  validateImageUpload,
  type AuthenticatedRequest,
} from './server/security.ts';
import { store } from './server/store.ts';

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeadersAndCors);

  // Use higher body limit only on image analysis route; strict 512kb limit everywhere else
  const standardJson = express.json({ limit: '512kb' });
  const imageJson = express.json({ limit: '7mb' });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/analyze-image') {
      imageJson(req, res, next);
    } else {
      standardJson(req, res, next);
    }
  });

  // Privacy-safe server request logger (never logs user prompts, passwords, or tokens)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - started;
      if (req.path !== '/health') {
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  const authLimiter = createRateLimiter({
    keyPrefix: 'auth',
    windowMs: 15 * 60 * 1000,
    maxAuthenticated: 30,
    maxGuest: 20,
  });

  const aiLimiter = createRateLimiter({
    keyPrefix: 'ai',
    windowMs: 60 * 1000,
    maxAuthenticated: 30,
    maxGuest: 12,
  });

  // ==========================================================================
  // 1. HEALTH & CONFIGURATION STATUS
  // ==========================================================================
  app.get('/api/health', (_req: Request, res: Response) => {
    const firebaseConfigured = Boolean(
      process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_PROJECT_ID
    );
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        ai: {
          configured: isGeminiConfigured(),
          model: getResolvedModel(),
        },
        authBackend: {
          mode: firebaseConfigured ? 'firebase' : 'encrypted-local-server',
          firebaseConfigured,
          guestTrialEnabled: true,
        },
      },
    });
  });

  // ==========================================================================
  // 2. USER AUTHENTICATION & PROFILE
  // ==========================================================================
  app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
    const { email, password, displayName } = req.body || {};
    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      });
      return;
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be between 8 and 128 characters.',
        },
      });
      return;
    }
    if (typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 80) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NAME',
          message: 'Display name must be between 2 and 80 characters.',
        },
      });
      return;
    }

    try {
      const user = store.createUser(email, password, displayName);
      const token = store.issueSessionToken(user.userId);
      const settings = store.getSettings(user.userId);
      res.status(201).json({
        success: true,
        data: { user, token, settings },
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists. Please sign in instead.',
          },
        });
        return;
      }
      store.recordError('/api/auth/register', 500, 'AUTH_REGISTER_ERROR', 'Registration failed');
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Unable to create account right now.' },
      });
    }
  });

  app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Please enter valid email and password.' },
      });
      return;
    }

    const user = store.authenticateUser(email, password);
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      });
      return;
    }

    const token = store.issueSessionToken(user.userId);
    const settings = store.getSettings(user.userId);
    res.json({
      success: true,
      data: { user, token, settings },
    });
  });

  app.post('/api/auth/logout', attachOptionalAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.rawToken) {
      store.revokeSessionToken(req.rawToken);
    }
    res.json({ success: true, data: { loggedOut: true } });
  });

  app.post('/api/auth/reset-request', authLimiter, (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
      });
      return;
    }
    const code = store.createPasswordResetCode(email);
    // In zero-cost self-hosted mode without a paid SMTP service, return a clear verification notice
    res.json({
      success: true,
      data: {
        sent: true,
        // Provided only when SMTP_HOST is not configured so local/self-hosted users can complete password reset without paid email providers
        verificationCode: process.env.SMTP_HOST ? undefined : code || undefined,
        notice: process.env.SMTP_HOST
          ? 'If an account matches that email, a 6-digit reset code has been sent.'
          : code
            ? 'Zero-cost local mode (no paid SMTP server configured): use the generated 6-digit verification code below within 15 minutes.'
            : 'No registered account was found with that email address.',
      },
    });
  });

  app.post('/api/auth/reset-confirm', authLimiter, (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body || {};
    if (!isValidEmail(email) || typeof code !== 'string' || code.trim().length !== 6) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_RESET_INPUT', message: 'Valid email and 6-digit code are required.' },
      });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 8 characters.' },
      });
      return;
    }

    const ok = store.resetPasswordWithCode(email, code, newPassword);
    if (!ok) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OR_EXPIRED_CODE',
          message: 'Reset code is invalid or expired. Please request a new code.',
        },
      });
      return;
    }

    res.json({ success: true, data: { passwordUpdated: true } });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const settings = store.getSettings(user.userId);
    res.json({ success: true, data: { user, settings } });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    // Strictly reject any attempt to pass role or isAdmin
    if ('role' in (req.body || {}) || 'isAdmin' in (req.body || {})) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_IMMUTABLE',
          message: 'Account role privileges cannot be modified through profile settings.',
        },
      });
      return;
    }

    const updated = store.updateUserProfile(user.userId, {
      displayName: req.body?.displayName,
      preferences: req.body?.preferences,
    });
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found.' },
      });
      return;
    }
    res.json({ success: true, data: { user: updated } });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD_INPUT',
          message: 'Current password and a new password (8+ characters) are required.',
        },
      });
      return;
    }

    const changed = store.changePassword(user.userId, currentPassword, newPassword);
    if (!changed) {
      res.status(401).json({
        success: false,
        error: { code: 'WRONG_PASSWORD', message: 'Current password is incorrect.' },
      });
      return;
    }
    res.json({ success: true, data: { passwordChanged: true } });
  });

  // ==========================================================================
  // 3. PRIVATE CONVERSATIONS & USER SETTINGS (AUTHENTICATED USERS ONLY)
  // ==========================================================================
  app.get('/api/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const conversations = store.listConversations(req.user!.userId);
    res.json({ success: true, data: { conversations } });
  });

  app.post('/api/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : 'New Conversation';
    const conversation = store.createConversation(req.user!.userId, title);
    res.status(201).json({ success: true, data: { conversation } });
  });

  app.get('/api/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const conversation = store.getConversation(req.user!.userId, req.params.id);
    if (!conversation) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found.' },
      });
      return;
    }
    const messages = store.listMessages(req.user!.userId, req.params.id) || [];
    res.json({ success: true, data: { conversation, messages } });
  });

  app.patch('/api/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const title = req.body?.title;
    if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 120) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TITLE', message: 'Title must be between 1 and 120 characters.' },
      });
      return;
    }
    const updated = store.renameConversation(req.user!.userId, req.params.id, title);
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found.' },
      });
      return;
    }
    res.json({ success: true, data: { conversation: updated } });
  });

  app.delete('/api/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const deleted = store.deleteConversation(req.user!.userId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found.' },
      });
      return;
    }
    res.json({ success: true, data: { deleted: true } });
  });

  app.delete('/api/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const removedCount = store.clearUserConversations(req.user!.userId);
    res.json({ success: true, data: { removedCount } });
  });

  app.get('/api/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const settings = store.getSettings(req.user!.userId);
    res.json({ success: true, data: { settings } });
  });

  app.put('/api/settings', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const settings = store.updateSettings(req.user!.userId, {
      language: req.body?.language,
      theme: req.body?.theme,
      preferences: req.body?.preferences,
    });
    res.json({ success: true, data: { settings } });
  });

  app.post('/api/feedback', attachOptionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const { category, message } = req.body || {};
    if (typeof message !== 'string' || message.trim().length < 5 || message.trim().length > 2000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FEEDBACK',
          message: 'Feedback message must be between 5 and 2000 characters.',
        },
      });
      return;
    }
    const saved = store.saveFeedback(
      req.user?.userId || null,
      typeof category === 'string' ? category : 'general',
      message
    );
    res.status(201).json({ success: true, data: { feedback: saved } });
  });

  // ==========================================================================
  // 4. CORE AI ENDPOINTS (CHAT, GENERATE, IMAGE, TRANSLATE, SUMMARIZE)
  // ==========================================================================
  app.post(
    '/api/chat',
    attachOptionalAuth,
    aiLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      const { message, history, conversationId, regenerate, uiLanguage } = req.body || {};

      if (typeof message !== 'string' || message.trim().length === 0 || message.length > 16000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MESSAGE',
            message: 'Message must be a non-empty string up to 16,000 characters.',
          },
        });
        return;
      }

      const safeHistory: ChatTurnInput[] = Array.isArray(history)
        ? history
            .filter(
              (item): item is ChatTurnInput =>
                Boolean(
                  item &&
                    (item.role === 'user' || item.role === 'model') &&
                    typeof item.content === 'string'
                )
            )
            .slice(-18)
        : [];

      try {
        let activeConversationId: string | null = null;
        let contextHistory: ChatTurnInput[] = safeHistory;

        if (req.user) {
          if (typeof conversationId === 'string' && conversationId.trim()) {
            const existingConv = store.getConversation(req.user.userId, conversationId);
            if (!existingConv) {
              res.status(404).json({
                success: false,
                error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found.' },
              });
              return;
            }
            activeConversationId = existingConv.conversationId;
            if (regenerate === true) {
              store.removeLastModelMessage(req.user.userId, activeConversationId);
            }
            const storedMsgs = store.listMessages(req.user.userId, activeConversationId) || [];
            contextHistory = storedMsgs.map((m) => ({ role: m.role, content: m.content }));
            if (regenerate === true && contextHistory.at(-1)?.role === 'user') {
              contextHistory = contextHistory.slice(0, -1);
            }
          } else {
            const autoTitle = message.trim().replace(/\s+/g, ' ').slice(0, 64);
            const created = store.createConversation(req.user.userId, autoTitle);
            activeConversationId = created.conversationId;
          }
        }

        store.recordAiRequest('chat', Boolean(req.user), 'chat');
        const reply = await runChatCompletion({
          message: message.trim(),
          history: contextHistory,
          uiLanguage: uiLanguage === 'ur' ? 'ur' : 'en',
        });

        let savedUserMessage = null;
        let savedModelMessage = null;
        let updatedConversation = null;

        if (req.user && activeConversationId) {
          if (regenerate !== true) {
            savedUserMessage = store.addMessage(
              req.user.userId,
              activeConversationId,
              'user',
              message.trim()
            );
          }
          savedModelMessage = store.addMessage(
            req.user.userId,
            activeConversationId,
            'model',
            reply
          );
          updatedConversation = store.getConversation(req.user.userId, activeConversationId);
        }

        res.json({
          success: true,
          data: {
            reply,
            conversation: updatedConversation,
            userMessage: savedUserMessage,
            modelMessage: savedModelMessage,
            persisted: Boolean(req.user),
          },
        });
      } catch (err) {
        const normalized = normalizeGeminiError(err);
        store.recordError('/api/chat', normalized.statusCode, normalized.code, normalized.message);
        res.status(normalized.statusCode).json({
          success: false,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    }
  );

  app.post(
    '/api/generate',
    attachOptionalAuth,
    aiLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      const { tool, prompt, language, tone, level, codeLanguage } = req.body || {};

      if (typeof tool !== 'string' || tool.trim().length === 0 || tool.length > 64) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TOOL', message: 'A valid AI tool identifier is required.' },
        });
        return;
      }
      if (typeof prompt !== 'string' || prompt.trim().length < 2 || prompt.length > 20000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PROMPT',
            message: 'Input text must be between 2 and 20,000 characters.',
          },
        });
        return;
      }

      try {
        store.recordAiRequest('generate', Boolean(req.user), tool.trim());
        const output = await runToolGeneration({
          tool: tool.trim(),
          prompt: prompt.trim(),
          language: typeof language === 'string' ? language : 'English',
          tone: typeof tone === 'string' ? tone : undefined,
          level:
            level === 'simple' || level === 'medium' || level === 'advanced' ? level : undefined,
          codeLanguage: typeof codeLanguage === 'string' ? codeLanguage : undefined,
        });

        res.json({
          success: true,
          data: { output, tool: tool.trim() },
        });
      } catch (err) {
        const normalized = normalizeGeminiError(err);
        store.recordError(
          '/api/generate',
          normalized.statusCode,
          normalized.code,
          normalized.message
        );
        res.status(normalized.statusCode).json({
          success: false,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    }
  );

  app.post(
    '/api/analyze-image',
    attachOptionalAuth,
    aiLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      const { mimeType, imageBase64, prompt, mode, language } = req.body || {};

      const check = validateImageUpload(mimeType, imageBase64);
      if (!check.valid) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_IMAGE', message: check.reason },
        });
        return;
      }

      const safePrompt = typeof prompt === 'string' ? prompt.slice(0, 4000) : '';

      try {
        store.recordAiRequest('analyzeImage', Boolean(req.user), 'image_understanding');
        const analysis = await runImageAnalysis({
          mimeType: check.mimeType,
          cleanBase64: check.cleanBase64,
          prompt: safePrompt,
          mode:
            mode === 'describe' || mode === 'ocr' || mode === 'objects' || mode === 'custom'
              ? mode
              : 'describe',
          language: typeof language === 'string' ? language : 'English',
        });

        res.json({
          success: true,
          data: { analysis },
        });
      } catch (err) {
        const normalized = normalizeGeminiError(err);
        store.recordError(
          '/api/analyze-image',
          normalized.statusCode,
          normalized.code,
          normalized.message
        );
        res.status(normalized.statusCode).json({
          success: false,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    }
  );

  app.post(
    '/api/translate',
    attachOptionalAuth,
    aiLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      const { text, sourceLanguage, targetLanguage } = req.body || {};

      if (typeof text !== 'string' || text.trim().length === 0 || text.length > 12000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEXT',
            message: 'Text to translate must be between 1 and 12,000 characters.',
          },
        });
        return;
      }
      if (typeof targetLanguage !== 'string' || targetLanguage.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TARGET_LANG', message: 'Target language is required.' },
        });
        return;
      }

      try {
        store.recordAiRequest('translate', Boolean(req.user), 'translator');
        const translation = await runTranslation({
          text: text.trim(),
          sourceLanguage:
            typeof sourceLanguage === 'string' && sourceLanguage.trim()
              ? sourceLanguage.trim()
              : 'Auto',
          targetLanguage: targetLanguage.trim(),
        });

        res.json({
          success: true,
          data: { translation },
        });
      } catch (err) {
        const normalized = normalizeGeminiError(err);
        store.recordError(
          '/api/translate',
          normalized.statusCode,
          normalized.code,
          normalized.message
        );
        res.status(normalized.statusCode).json({
          success: false,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    }
  );

  app.post(
    '/api/summarize',
    attachOptionalAuth,
    aiLimiter,
    async (req: AuthenticatedRequest, res: Response) => {
      const { text, level, language } = req.body || {};

      if (typeof text !== 'string' || text.trim().length < 20 || text.length > 24000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SUMMARY_TEXT',
            message: 'Please provide between 20 and 24,000 characters of text to summarize.',
          },
        });
        return;
      }

      try {
        store.recordAiRequest('summarize', Boolean(req.user), 'summarizer');
        const summary = await runSummarization({
          text: text.trim(),
          level:
            level === 'simple' || level === 'medium' || level === 'advanced' ? level : 'medium',
          language: typeof language === 'string' ? language : 'English',
        });

        res.json({
          success: true,
          data: { summary },
        });
      } catch (err) {
        const normalized = normalizeGeminiError(err);
        store.recordError(
          '/api/summarize',
          normalized.statusCode,
          normalized.code,
          normalized.message
        );
        res.status(normalized.statusCode).json({
          success: false,
          error: { code: normalized.code, message: normalized.message },
        });
      }
    }
  );

  // ==========================================================================
  // 5. PROTECTED ADMIN DASHBOARD ENDPOINT
  // ==========================================================================
  app.get('/api/admin/overview', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    const overview = store.getAdminOverview();
    res.json({
      success: true,
      data: {
        ...overview,
        systemHealth: {
          status: 'healthy',
          uptimeSeconds: Math.floor(process.uptime()),
          memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          geminiConfigured: isGeminiConfigured(),
          geminiModel: getResolvedModel(),
          nodeVersion: process.version,
        },
      },
    });
  });

  // Catch-all for unknown /api routes
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'ENDPOINT_NOT_FOUND', message: 'Requested API endpoint does not exist.' },
    });
  });

  // JSON parse / payload size error handler
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
      res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload exceeds the maximum allowed upload size.',
        },
      });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_JSON', message: 'Malformed JSON request body.' },
      });
      return;
    }
    next(err);
  });

  // ==========================================================================
  // 6. FRONTEND DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ==========================================================================
  const distPath = path.resolve(process.cwd(), 'dist');
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Smart Assistant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
