import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '../services/api';
import type {
  AppView,
  Conversation,
  HealthStatus,
  ThemeMode,
  UILanguage,
  UserPreferences,
  UserProfile,
} from '../types';
import { UI_STRINGS } from '../utils/i18n';

interface AppContextValue {
  view: AppView;
  navigate: (nextView: AppView, options?: { conversationId?: string | null; initialPrompt?: string }) => void;
  user: UserProfile | null;
  authLoading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  language: UILanguage;
  setLanguage: (next: UILanguage) => void;
  t: (key: string) => string;
  health: HealthStatus | null;
  refreshHealth: () => Promise<void>;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  pendingChatPrompt: string | null;
  clearPendingChatPrompt: () => void;
  refreshConversations: () => Promise<void>;
  handleAuthSuccess: (user: UserProfile, token: string, settings?: { language?: UILanguage; theme?: ThemeMode }) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const THEME_KEY = 'ai_smart_assistant_theme';
const LANG_KEY = 'ai_smart_assistant_lang';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<AppView>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const [language, setLanguageState] = useState<UILanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved === 'ur' ? 'ur' : 'en';
    } catch {
      return 'en';
    }
  });

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingChatPrompt, setPendingChatPrompt] = useState<string | null>(null);

  // Sync theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Sync language and RTL/LTR direction to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === 'ur' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  // Browser & Android hardware back navigation integration
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const targetView = (event.state?.view as AppView) || 'dashboard';
      setView(targetView);
    };
    window.addEventListener('popstate', onPopState);
    window.history.replaceState({ view: 'dashboard' }, '');
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback(
    (nextView: AppView, options?: { conversationId?: string | null; initialPrompt?: string }) => {
      if (options && 'conversationId' in options) {
        setActiveConversationId(options.conversationId ?? null);
      }
      if (options?.initialPrompt) {
        setPendingChatPrompt(options.initialPrompt);
      }
      setView((current) => {
        if (current !== nextView) {
          window.history.pushState({ view: nextView }, '');
        }
        return nextView;
      });
    },
    []
  );

  const clearPendingChatPrompt = useCallback(() => {
    setPendingChatPrompt(null);
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      // Handled gracefully in UI
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!getStoredToken()) {
      setConversations([]);
      return;
    }
    try {
      const res = await api.listConversations();
      setConversations(res.conversations);
    } catch {
      // Ignore if token expired
    }
  }, []);

  // Initial boot: check health & restore authenticated user session
  useEffect(() => {
    let mounted = true;
    refreshHealth();

    const token = getStoredToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api
      .getMe()
      .then(async ({ user: fetchedUser, settings }) => {
        if (!mounted) return;
        setUser(fetchedUser);
        if (settings?.theme) setThemeState(settings.theme);
        if (settings?.language) setLanguageState(settings.language);
        const convRes = await api.listConversations();
        if (mounted) setConversations(convRes.conversations);
      })
      .catch(() => {
        setStoredToken(null);
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refreshHealth]);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      setThemeState(next);
      if (user) {
        api.updateSettings({ theme: next }).catch(() => {});
      }
    },
    [user]
  );

  const setLanguage = useCallback(
    (next: UILanguage) => {
      setLanguageState(next);
      if (user) {
        api.updateSettings({ language: next }).catch(() => {});
      }
    },
    [user]
  );

  const handleAuthSuccess = useCallback(
    async (
      authedUser: UserProfile,
      token: string,
      settings?: { language?: UILanguage; theme?: ThemeMode }
    ) => {
      setStoredToken(token);
      setUser(authedUser);
      if (settings?.theme) setThemeState(settings.theme);
      if (settings?.language) setLanguageState(settings.language);
      setAuthModalOpen(false);
      try {
        const res = await api.listConversations();
        setConversations(res.conversations);
      } catch {
        setConversations([]);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network failure during logout
    }
    setStoredToken(null);
    setUser(null);
    setConversations([]);
    setActiveConversationId(null);
    if (view === 'admin' || view === 'profile') {
      setView('dashboard');
    }
  }, [view]);

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      if (!user) return;
      const res = await api.updateProfile({ preferences: patch });
      setUser(res.user);
      await api.updateSettings({ preferences: patch });
    },
    [user]
  );

  const t = useCallback(
    (key: string): string => {
      return UI_STRINGS[language][key] || UI_STRINGS.en[key] || key;
    },
    [language]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      view,
      navigate,
      user,
      authLoading,
      authModalOpen,
      setAuthModalOpen,
      theme,
      setTheme,
      language,
      setLanguage,
      t,
      health,
      refreshHealth,
      conversations,
      activeConversationId,
      setActiveConversationId,
      pendingChatPrompt,
      clearPendingChatPrompt,
      refreshConversations,
      handleAuthSuccess,
      logout,
      updatePreferences,
      setUser,
    }),
    [
      view,
      navigate,
      user,
      authLoading,
      authModalOpen,
      theme,
      setTheme,
      language,
      setLanguage,
      t,
      health,
      refreshHealth,
      conversations,
      activeConversationId,
      pendingChatPrompt,
      clearPendingChatPrompt,
      refreshConversations,
      handleAuthSuccess,
      logout,
      updatePreferences,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
