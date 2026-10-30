import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Code2,
  FilePenLine,
  Image as ImageIcon,
  Languages,
  MessageSquare,
  Plus,
  Send,
  Settings,
  UserCircle2,
  WandSparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useApp } from '../context/AppContext';
import type { AppView } from '../types';

export const HomeDashboard: React.FC = () => {
  const {
    navigate,
    user,
    setAuthModalOpen,
    conversations,
    language,
    t,
    health,
  } = useApp();

  const [quickPrompt, setQuickPrompt] = useState('');

  const handleQuickChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickPrompt.trim();
    if (!trimmed) return;
    setQuickPrompt('');
    navigate('chat', { conversationId: null, initialPrompt: trimmed });
  };

  const featureCards: {
    id: AppView;
    title: string;
    description: string;
    meta: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'writing',
      title: language === 'ur' ? 'اے آئی تحریری ٹولز' : 'AI Writing Assistant',
      description:
        language === 'ur'
          ? 'مضامین، کہانیاں، یوٹیوب اسکرپٹ، ای میلز، بلاگز اور گرامر کی اصلاح۔'
          : '10 dedicated generators for articles, scripts, emails, blogs, captions, and grammar.',
      meta: '10 Specialized Tools · Bilingual',
      icon: FilePenLine,
    },
    {
      id: 'image',
      title: language === 'ur' ? 'تصویری تجزیہ اور فہم' : 'Image Understanding',
      description:
        language === 'ur'
          ? 'تصویر اپ لوڈ کریں، متن نکالیں، اشیاء پہچانیں اور سوالات پوچھیں۔'
          : 'Upload photos or documents to describe scenes, extract visible text, and ask questions.',
      meta: 'Multimodal Vision · Max 4 MB',
      icon: ImageIcon,
    },
    {
      id: 'translate',
      title: language === 'ur' ? 'اے آئی مترجم' : 'Translation Tool',
      description:
        language === 'ur'
          ? 'انگریزی، اردو، ہندی، عربی اور دیگر زبانوں میں فوری اور درست ترجمہ۔'
          : 'Natural translation across English, Urdu, Hindi, Arabic, Persian, and global languages.',
      meta: '12+ Languages · RTL Ready',
      icon: Languages,
    },
    {
      id: 'study',
      title: language === 'ur' ? 'تعلیمی معاون' : 'Study Assistant',
      description:
        language === 'ur'
          ? 'اسکول کے سوالات، نوٹس، ایم سی کیو کوئز اور ریاضی کی مرحلہ وار وضاحت۔'
          : 'Topic explanations, study notes, MCQ quizzes, summaries, and step-by-step math.',
      meta: 'Simple · Medium · Advanced',
      icon: BookOpen,
    },
    {
      id: 'code',
      title: language === 'ur' ? 'کوڈ اسسٹنٹ' : 'Code Assistant',
      description:
        language === 'ur'
          ? 'ایچ ٹی ایم ایل، سی ایس ایس، جاوا اسکرپٹ اور پائتھن کوڈ لکھیں اور درست کریں۔'
          : 'Generate, explain, debug, and refactor HTML, CSS, JavaScript, TypeScript, and Python.',
      meta: 'Syntax Formatted · Copy Ready',
      icon: Code2,
    },
    {
      id: 'prompt',
      title: language === 'ur' ? 'پرامپٹ جنریٹر' : 'Prompt Generator',
      description:
        language === 'ur'
          ? 'بہترین اے آئی نتائج کے لیے پیشہ ورانہ پرامپٹس تیار کریں۔'
          : 'Turn rough goals into structured, high-precision prompts for any workflow.',
      meta: '3 Structured Frameworks',
      icon: WandSparkles,
    },
    {
      id: 'settings',
      title: language === 'ur' ? 'ترتیبات' : 'App Settings',
      description:
        language === 'ur'
          ? 'اردو اور انگریزی زبان، ڈارک موڈ، رازداری اور فیڈ بیک۔'
          : 'Switch English or Urdu layout, toggle dark/light theme, manage history, and send feedback.',
      meta: 'Theme · Language · Privacy',
      icon: Settings,
    },
    {
      id: 'profile',
      title: language === 'ur' ? 'صارف پروفائل' : 'User Profile',
      description:
        language === 'ur'
          ? 'اپنا اکاؤنٹ، ترجیحات اور پاس ورڈ محفوظ طریقے سے منظم کریں۔'
          : user
            ? `Signed in as ${user.displayName}. Manage profile preferences and account security.`
            : 'Sign in or create a free account to persist private conversations across sessions.',
      meta: user ? `${user.email}` : 'Guest Session · Sign In Available',
      icon: UserCircle2,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Unconfigured Gemini API Key Banner (Transparent status if missing) */}
      {health && !health.ai.configured && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Gemini API Key Required for AI Responses</p>
            <p className="mt-1 text-xs opacity-90">
              Server environment variable <code className="font-mono">GEMINI_API_KEY</code> is not set yet. Configure it in Settings &gt; Secrets (or <code className="font-mono">.env</code> locally) to enable live AI generation.
            </p>
          </div>
        </div>
      )}

      {/* Hero Focal Anchor: Welcome + Direct AI Chat Box */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={false} />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {user
                  ? `${language === 'ur' ? 'خوش آمدید' : 'Welcome back'}, ${user.displayName}`
                  : t('guestNotice')}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              {t('welcomeTitle')}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {t('welcomeSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => navigate('chat', { conversationId: null })}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t('startNewChat')}</span>
            </button>
          </div>
        </div>

        {/* Direct AI Chat Input Box */}
        <form onSubmit={handleQuickChatSubmit} className="relative">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder={t('quickChatPlaceholder')}
              className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={!quickPrompt.trim()}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>{t('send')}</span>
            </button>
          </div>

          {/* Starter Quick Prompts */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Try:</span>
            {[
              'Explain photosynthesis in simple Urdu',
              'Python seekhne ka step-by-step plan batao',
              'Write a professional project update email',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => navigate('chat', { conversationId: null, initialPrompt: sample })}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Recent Conversations Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('recentConversations')}
          </h2>
          {user ? (
            <button
              type="button"
              onClick={() => navigate('chat')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Sign in to sync history
            </button>
          )}
        </div>

        {user && conversations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {conversations.slice(0, 3).map((conv) => (
              <button
                key={conv.conversationId}
                type="button"
                onClick={() => navigate('chat', { conversationId: conv.conversationId })}
                className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {conv.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Updated · {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {user ? t('noConversationsYet') : t('guestNotice')}
            </p>
            <button
              type="button"
              onClick={() =>
                user ? navigate('chat', { conversationId: null }) : setAuthModalOpen(true)
              }
              className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user ? t('startNewChat') : t('signIn')}
            </button>
          </div>
        )}
      </section>

      {/* Core AI Workspace Tools Grid */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {language === 'ur' ? 'تمام اے آئی ٹولز' : 'Workspace Capabilities'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => navigate(card.id)}
                className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <p className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {card.meta}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
