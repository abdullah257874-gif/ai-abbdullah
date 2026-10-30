import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface UserPreferences {
  defaultToolLanguage: string;
  explanationLevel: 'simple' | 'medium' | 'advanced';
  autoScroll: boolean;
}

export interface UserRecord {
  userId: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
  preferences: UserPreferences;
}

export interface PublicUser {
  userId: string;
  displayName: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  preferences: UserPreferences;
}

export interface ConversationRecord {
  conversationId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  messageId: string;
  conversationId: string;
  userId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

export interface UserSettingsRecord {
  userId: string;
  language: 'en' | 'ur';
  theme: 'light' | 'dark';
  preferences: UserPreferences;
  updatedAt: string;
}

export interface ResetTokenRecord {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

export interface FeedbackRecord {
  feedbackId: string;
  userId: string | null;
  category: string;
  message: string;
  createdAt: string;
}

export interface ErrorLogEntry {
  id: string;
  endpoint: string;
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
}

export interface MetricsState {
  totalAiRequests: number;
  guestAiRequests: number;
  authenticatedAiRequests: number;
  byEndpoint: Record<string, number>;
  byTool: Record<string, number>;
  dailyCounts: Record<string, number>;
  recentErrors: ErrorLogEntry[];
}

interface DatabaseSchema {
  users: UserRecord[];
  conversations: ConversationRecord[];
  messages: MessageRecord[];
  user_settings: UserSettingsRecord[];
  reset_tokens: ResetTokenRecord[];
  revoked_tokens: Record<string, number>;
  feedback: FeedbackRecord[];
  metrics: MetricsState;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'assistant-db.json');

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`ai-smart-assistant-${process.cwd()}`).digest('hex');

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  [process.env.ADMIN_EMAIL, 'abdullah257874@gmail.com']
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => v.trim().toLowerCase())
);

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultToolLanguage: 'English',
  explanationLevel: 'medium',
  autoScroll: true,
};

function createEmptyDb(): DatabaseSchema {
  return {
    users: [],
    conversations: [],
    messages: [],
    user_settings: [],
    reset_tokens: [],
    revoked_tokens: {},
    feedback: [],
    metrics: {
      totalAiRequests: 0,
      guestAiRequests: 0,
      authenticatedAiRequests: 0,
      byEndpoint: {
        chat: 0,
        generate: 0,
        analyzeImage: 0,
        translate: 0,
        summarize: 0,
      },
      byTool: {},
      dailyCounts: {},
      recentErrors: [],
    },
  };
}

class LocalEncryptedStore {
  private state: DatabaseSchema;

  constructor() {
    this.state = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        const initial = createEmptyDb();
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), { mode: 0o600 });
        return initial;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      const base = createEmptyDb();
      return {
        ...base,
        ...parsed,
        metrics: {
          ...base.metrics,
          ...(parsed.metrics || {}),
          byEndpoint: { ...base.metrics.byEndpoint, ...(parsed.metrics?.byEndpoint || {}) },
          byTool: { ...(parsed.metrics?.byTool || {}) },
          dailyCounts: { ...(parsed.metrics?.dailyCounts || {}) },
          recentErrors: Array.isArray(parsed.metrics?.recentErrors)
            ? parsed.metrics.recentErrors.slice(0, 50)
            : [],
        },
      };
    } catch {
      return createEmptyDb();
    }
  }

  private persist(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.state, null, 2), { mode: 0o600 });
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[Store] Failed to persist state:', err instanceof Error ? err.message : 'Unknown');
    }
  }

  public hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
  }

  public verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, keyHex] = parts;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  }

  public issueSessionToken(userId: string): string {
    const payload = {
      sub: userId,
      iat: Date.now(),
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
      jti: crypto.randomBytes(12).toString('hex'),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    return `${encoded}.${sig}`;
  }

  public verifySessionToken(token: string): PublicUser | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
        sub: string;
        exp: number;
        jti: string;
      };
      if (!payload.sub || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
        return null;
      }
      if (this.state.revoked_tokens[payload.jti]) {
        return null;
      }
      const user = this.state.users.find((u) => u.userId === payload.sub);
      if (!user) return null;
      return this.toPublicUser(user);
    } catch {
      return null;
    }
  }

  public revokeSessionToken(token: string): void {
    const parts = token.split('.');
    if (parts.length !== 2) return;
    try {
      const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8')) as {
        jti?: string;
        exp?: number;
      };
      if (payload.jti) {
        this.state.revoked_tokens[payload.jti] = payload.exp || Date.now() + 86400000;
        // Prune expired revocations
        const now = Date.now();
        for (const [k, exp] of Object.entries(this.state.revoked_tokens)) {
          if (exp < now) delete this.state.revoked_tokens[k];
        }
        this.persist();
      }
    } catch {
      // Ignore malformed token
    }
  }

  public toPublicUser(user: UserRecord): PublicUser {
    const normalizedEmail = user.email.toLowerCase();
    const effectiveRole: 'user' | 'admin' =
      user.role === 'admin' || BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail) ? 'admin' : 'user';
    return {
      userId: user.userId,
      displayName: user.displayName,
      email: user.email,
      role: effectiveRole,
      createdAt: user.createdAt,
      preferences: user.preferences,
    };
  }

  public createUser(email: string, password: string, displayName: string): PublicUser {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomBytes(10).toString('hex')}`;
    const isAdmin = BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail);

    const record: UserRecord = {
      userId,
      displayName: displayName.trim(),
      email: normalizedEmail,
      passwordHash: this.hashPassword(password),
      role: isAdmin ? 'admin' : 'user',
      createdAt: now,
      preferences: { ...DEFAULT_PREFERENCES },
    };

    this.state.users.push(record);
    this.state.user_settings.push({
      userId,
      language: 'en',
      theme: 'light',
      preferences: { ...DEFAULT_PREFERENCES },
      updatedAt: now,
    });
    this.persist();
    return this.toPublicUser(record);
  }

  public authenticateUser(email: string, password: string): PublicUser | null {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) return null;
    if (!this.verifyPassword(password, user.passwordHash)) return null;
    if (BOOTSTRAP_ADMIN_EMAILS.has(normalizedEmail) && user.role !== 'admin') {
      user.role = 'admin';
      this.persist();
    }
    return this.toPublicUser(user);
  }

  public updateUserProfile(
    userId: string,
    updates: { displayName?: string; preferences?: Partial<UserPreferences> }
  ): PublicUser | null {
    const user = this.state.users.find((u) => u.userId === userId);
    if (!user) return null;
    // Notice: role and email are strictly immutable here so users can NEVER become admins via profile edits
    if (typeof updates.displayName === 'string' && updates.displayName.trim().length >= 2) {
      user.displayName = updates.displayName.trim().slice(0, 80);
    }
    if (updates.preferences) {
      user.preferences = {
        ...user.preferences,
        ...(typeof updates.preferences.defaultToolLanguage === 'string'
          ? { defaultToolLanguage: updates.preferences.defaultToolLanguage.slice(0, 40) }
          : {}),
        ...(updates.preferences.explanationLevel &&
        ['simple', 'medium', 'advanced'].includes(updates.preferences.explanationLevel)
          ? { explanationLevel: updates.preferences.explanationLevel }
          : {}),
        ...(typeof updates.preferences.autoScroll === 'boolean'
          ? { autoScroll: updates.preferences.autoScroll }
          : {}),
      };
    }
    this.persist();
    return this.toPublicUser(user);
  }

  public changePassword(userId: string, currentPassword: string, newPassword: string): boolean {
    const user = this.state.users.find((u) => u.userId === userId);
    if (!user) return false;
    if (!this.verifyPassword(currentPassword, user.passwordHash)) return false;
    user.passwordHash = this.hashPassword(newPassword);
    this.persist();
    return true;
  }

  public createPasswordResetCode(email: string): string | null {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) return null;
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const tokenHash = crypto.createHash('sha256').update(`${user.userId}:${rawCode}`).digest('hex');
    this.state.reset_tokens = this.state.reset_tokens.filter(
      (t) => t.userId !== user.userId && t.expiresAt > Date.now()
    );
    this.state.reset_tokens.push({
      tokenHash,
      userId: user.userId,
      expiresAt: Date.now() + 1000 * 60 * 15, // 15 minutes
    });
    this.persist();
    return rawCode;
  }

  public resetPasswordWithCode(email: string, code: string, newPassword: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) return false;
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${user.userId}:${code.trim()}`)
      .digest('hex');
    const tokenIdx = this.state.reset_tokens.findIndex(
      (t) => t.userId === user.userId && t.tokenHash === expectedHash && t.expiresAt > Date.now()
    );
    if (tokenIdx === -1) return false;
    user.passwordHash = this.hashPassword(newPassword);
    this.state.reset_tokens.splice(tokenIdx, 1);
    this.persist();
    return true;
  }

  // Conversations & Messages (strictly isolated by userId)
  public listConversations(userId: string): ConversationRecord[] {
    return this.state.conversations
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public getConversation(userId: string, conversationId: string): ConversationRecord | null {
    return (
      this.state.conversations.find(
        (c) => c.conversationId === conversationId && c.userId === userId
      ) || null
    );
  }

  public createConversation(userId: string, title: string): ConversationRecord {
    const now = new Date().toISOString();
    const conv: ConversationRecord = {
      conversationId: `conv_${crypto.randomBytes(10).toString('hex')}`,
      userId,
      title: title.trim().slice(0, 120) || 'New Conversation',
      createdAt: now,
      updatedAt: now,
    };
    this.state.conversations.push(conv);
    this.persist();
    return conv;
  }

  public renameConversation(
    userId: string,
    conversationId: string,
    title: string
  ): ConversationRecord | null {
    const conv = this.getConversation(userId, conversationId);
    if (!conv) return null;
    conv.title = title.trim().slice(0, 120) || conv.title;
    conv.updatedAt = new Date().toISOString();
    this.persist();
    return conv;
  }

  public deleteConversation(userId: string, conversationId: string): boolean {
    const idx = this.state.conversations.findIndex(
      (c) => c.conversationId === conversationId && c.userId === userId
    );
    if (idx === -1) return false;
    this.state.conversations.splice(idx, 1);
    this.state.messages = this.state.messages.filter((m) => m.conversationId !== conversationId);
    this.persist();
    return true;
  }

  public clearUserConversations(userId: string): number {
    const userConvIds = new Set(
      this.state.conversations.filter((c) => c.userId === userId).map((c) => c.conversationId)
    );
    const removedCount = userConvIds.size;
    this.state.conversations = this.state.conversations.filter((c) => c.userId !== userId);
    this.state.messages = this.state.messages.filter((m) => !userConvIds.has(m.conversationId));
    this.persist();
    return removedCount;
  }

  public listMessages(userId: string, conversationId: string): MessageRecord[] | null {
    const conv = this.getConversation(userId, conversationId);
    if (!conv) return null;
    return this.state.messages
      .filter((m) => m.conversationId === conversationId && m.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public addMessage(
    userId: string,
    conversationId: string,
    role: 'user' | 'model',
    content: string
  ): MessageRecord | null {
    const conv = this.getConversation(userId, conversationId);
    if (!conv) return null;
    const now = new Date().toISOString();
    const msg: MessageRecord = {
      messageId: `msg_${crypto.randomBytes(10).toString('hex')}`,
      conversationId,
      userId,
      role,
      content: content.slice(0, 32000),
      createdAt: now,
    };
    this.state.messages.push(msg);
    conv.updatedAt = now;
    this.persist();
    return msg;
  }

  public removeLastModelMessage(userId: string, conversationId: string): boolean {
    const conv = this.getConversation(userId, conversationId);
    if (!conv) return false;
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      const m = this.state.messages[i];
      if (m.conversationId === conversationId && m.userId === userId && m.role === 'model') {
        this.state.messages.splice(i, 1);
        this.persist();
        return true;
      }
    }
    return false;
  }

  // User Settings
  public getSettings(userId: string): UserSettingsRecord {
    let settings = this.state.user_settings.find((s) => s.userId === userId);
    if (!settings) {
      settings = {
        userId,
        language: 'en',
        theme: 'light',
        preferences: { ...DEFAULT_PREFERENCES },
        updatedAt: new Date().toISOString(),
      };
      this.state.user_settings.push(settings);
      this.persist();
    }
    return settings;
  }

  public updateSettings(
    userId: string,
    patch: {
      language?: 'en' | 'ur';
      theme?: 'light' | 'dark';
      preferences?: Partial<UserPreferences>;
    }
  ): UserSettingsRecord {
    const settings = this.getSettings(userId);
    if (patch.language === 'en' || patch.language === 'ur') {
      settings.language = patch.language;
    }
    if (patch.theme === 'light' || patch.theme === 'dark') {
      settings.theme = patch.theme;
    }
    if (patch.preferences) {
      settings.preferences = {
        ...settings.preferences,
        ...(typeof patch.preferences.defaultToolLanguage === 'string'
          ? { defaultToolLanguage: patch.preferences.defaultToolLanguage.slice(0, 40) }
          : {}),
        ...(patch.preferences.explanationLevel &&
        ['simple', 'medium', 'advanced'].includes(patch.preferences.explanationLevel)
          ? { explanationLevel: patch.preferences.explanationLevel }
          : {}),
        ...(typeof patch.preferences.autoScroll === 'boolean'
          ? { autoScroll: patch.preferences.autoScroll }
          : {}),
      };
    }
    settings.updatedAt = new Date().toISOString();
    this.persist();
    return settings;
  }

  // Feedback
  public saveFeedback(userId: string | null, category: string, message: string): FeedbackRecord {
    const rec: FeedbackRecord = {
      feedbackId: `fb_${crypto.randomBytes(8).toString('hex')}`,
      userId,
      category: category.trim().slice(0, 40) || 'general',
      message: message.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    this.state.feedback.unshift(rec);
    if (this.state.feedback.length > 200) {
      this.state.feedback = this.state.feedback.slice(0, 200);
    }
    this.persist();
    return rec;
  }

  // Telemetry & Admin Stats (privacy-preserving: never stores prompt text)
  public recordAiRequest(endpoint: string, isAuthenticated: boolean, toolName?: string): void {
    this.state.metrics.totalAiRequests += 1;
    if (isAuthenticated) {
      this.state.metrics.authenticatedAiRequests += 1;
    } else {
      this.state.metrics.guestAiRequests += 1;
    }
    this.state.metrics.byEndpoint[endpoint] = (this.state.metrics.byEndpoint[endpoint] || 0) + 1;
    if (toolName) {
      this.state.metrics.byTool[toolName] = (this.state.metrics.byTool[toolName] || 0) + 1;
    }
    const dayKey = new Date().toISOString().slice(0, 10);
    this.state.metrics.dailyCounts[dayKey] = (this.state.metrics.dailyCounts[dayKey] || 0) + 1;
    this.persist();
  }

  public recordError(endpoint: string, statusCode: number, code: string, safeMessage: string): void {
    this.state.metrics.recentErrors.unshift({
      id: `err_${crypto.randomBytes(6).toString('hex')}`,
      endpoint,
      statusCode,
      code,
      message: safeMessage.slice(0, 240),
      timestamp: new Date().toISOString(),
    });
    if (this.state.metrics.recentErrors.length > 40) {
      this.state.metrics.recentErrors = this.state.metrics.recentErrors.slice(0, 40);
    }
    this.persist();
  }

  public getAdminOverview() {
    return {
      totalRegisteredUsers: this.state.users.length,
      totalConversations: this.state.conversations.length,
      totalStoredMessages: this.state.messages.length,
      totalFeedbackItems: this.state.feedback.length,
      metrics: this.state.metrics,
      recentFeedback: this.state.feedback.slice(0, 10),
    };
  }
}

export const store = new LocalEncryptedStore();
