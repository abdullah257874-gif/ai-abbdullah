export type AppView =
  | 'dashboard'
  | 'chat'
  | 'writing'
  | 'image'
  | 'translate'
  | 'study'
  | 'code'
  | 'prompt'
  | 'settings'
  | 'profile'
  | 'admin';

export type UILanguage = 'en' | 'ur';
export type ThemeMode = 'light' | 'dark';
export type ExplanationLevel = 'simple' | 'medium' | 'advanced';

export interface UserPreferences {
  defaultToolLanguage: string;
  explanationLevel: ExplanationLevel;
  autoScroll: boolean;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserSettings {
  userId: string;
  language: UILanguage;
  theme: ThemeMode;
  preferences: UserPreferences;
  updatedAt: string;
}

export interface Conversation {
  conversationId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

export type WritingToolId =
  | 'article_writer'
  | 'story_writer'
  | 'youtube_script'
  | 'youtube_title'
  | 'social_caption'
  | 'email_writer'
  | 'business_description'
  | 'blog_writer'
  | 'grammar_corrector'
  | 'creative_ideas';

export interface WritingToolMeta {
  id: WritingToolId;
  titleEn: string;
  titleUr: string;
  descEn: string;
  descUr: string;
  placeholderEn: string;
  placeholderUr: string;
}

export type StudyModeId =
  | 'study_explain'
  | 'study_qa'
  | 'study_notes'
  | 'study_quiz'
  | 'study_math'
  | 'summarize'
  | 'study_practice';

export type CodeModeId =
  | 'code_generate'
  | 'code_explain'
  | 'code_debug'
  | 'code_improve';

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  ai: {
    configured: boolean;
    model: string;
  };
  authBackend: {
    mode: 'firebase' | 'encrypted-local-server';
    firebaseConfigured: boolean;
    guestTrialEnabled: boolean;
  };
}

export interface AdminOverviewData {
  totalRegisteredUsers: number;
  totalConversations: number;
  totalStoredMessages: number;
  totalFeedbackItems: number;
  metrics: {
    totalAiRequests: number;
    guestAiRequests: number;
    authenticatedAiRequests: number;
    byEndpoint: Record<string, number>;
    byTool: Record<string, number>;
    dailyCounts: Record<string, number>;
    recentErrors: {
      id: string;
      endpoint: string;
      statusCode: number;
      code: string;
      message: string;
      timestamp: string;
    }[];
  };
  recentFeedback: {
    feedbackId: string;
    userId: string | null;
    category: string;
    message: string;
    createdAt: string;
  }[];
  systemHealth: {
    status: string;
    uptimeSeconds: number;
    memoryRssMb: number;
    geminiConfigured: boolean;
    geminiModel: string;
    nodeVersion: string;
  };
}
