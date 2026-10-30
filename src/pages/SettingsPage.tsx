import {
  CheckCircle2,
  Globe2,
  Info,
  MessageSquareHeart,
  Moon,
  Shield,
  Sun,
  Trash2,
  UserCog,
} from 'lucide-react';
import React, { useState } from 'react';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    user,
    navigate,
    setAuthModalOpen,
    refreshConversations,
    setActiveConversationId,
    health,
  } = useApp();

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearNotice, setClearNotice] = useState<string | null>(null);

  const [feedbackCategory, setFeedbackCategory] = useState('feature');
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const handleClearHistory = async () => {
    if (!user) return;
    setClearing(true);
    setClearNotice(null);
    try {
      const res = await api.clearConversations();
      setActiveConversationId(null);
      await refreshConversations();
      setConfirmClear(false);
      setClearNotice(`Cleared ${res.removedCount} saved conversation(s) from your account.`);
    } catch (err) {
      setClearNotice(err instanceof Error ? err.message : 'Unable to clear history.');
    } finally {
      setClearing(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackText.trim().length < 5 || sendingFeedback) return;
    setSendingFeedback(true);
    setFeedbackSuccess(null);
    try {
      await api.submitFeedback({ category: feedbackCategory, message: feedbackText.trim() });
      setFeedbackText('');
      setFeedbackSuccess('Thank you! Your feedback has been recorded.');
    } catch (err) {
      setFeedbackSuccess(err instanceof Error ? err.message : 'Failed to send feedback.');
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'ur' ? 'ایپ کی ترتیبات' : 'Application Settings'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure interface language, dark or light theme, conversation storage, privacy, and mobile installation.
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {/* Appearance & Language */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Language &amp; Appearance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Globe2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Interface Language &amp; Layout Direction</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                English (LTR)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ur')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  language === 'ur'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                اردو (RTL)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-blue-600" />
              )}
              <span>Color Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account & Conversation History Management */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Account &amp; Conversation History
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Account Settings
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user
                ? `Signed in as ${user.email}`
                : 'Currently browsing in Guest Mode. Sign in to manage profile and password.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (user ? navigate('profile') : setAuthModalOpen(true))}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            <UserCog className="w-4 h-4" />
            <span>{user ? 'Open Profile Settings' : 'Sign In / Register'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Clear Conversation History
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permanently delete all saved conversations and messages associated with your account.
            </p>
          </div>

          {!user ? (
            <span className="text-xs text-slate-400">No stored guest history</span>
          ) : !confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All History</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearHistory}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                {clearing ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {clearNotice && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{clearNotice}</p>
        )}
      </section>

      {/* Privacy & About Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Privacy &amp; Security
            </h2>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-4">
            <li>Gemini API keys remain strictly on the backend server and are never exposed in client code.</li>
            <li>Passwords are salted and hashed with cryptographic scrypt; plain-text passwords are never stored.</li>
            <li>Each user can read, modify, or delete only their own private conversation records.</li>
            <li>Guest mode allows testing AI tools without storing private chat logs on the server.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              About AI Smart Assistant
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            AI Smart Assistant is a responsive web application, installable Progressive Web App (PWA), and Capacitor Android package (<code className="font-mono">com.aismartassistant.app</code>) built on a free-tier-first architecture.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1 tabular-nums">
            <p>
              AI Engine · {health?.ai.configured ? `Connected (${health.ai.model})` : 'Awaiting GEMINI_API_KEY'}
            </p>
            <p>
              Data Store · {health?.authBackend.firebaseConfigured ? 'Cloud Firestore' : 'Encrypted Self-Hosted Store (Firebase unconfigured)'}
            </p>
          </div>
        </section>
      </div>

      {/* Feedback Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareHeart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Send Feedback
          </h2>
        </div>

        <form onSubmit={handleFeedbackSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={feedbackCategory}
              onChange={(e) => setFeedbackCategory(e.target.value)}
              className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
            >
              <option value="feature">Feature Suggestion</option>
              <option value="bug">Issue / Bug Report</option>
              <option value="urdu">Urdu / Language Quality</option>
              <option value="general">General Feedback</option>
            </select>
            <input
              type="text"
              required
              minLength={5}
              maxLength={2000}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your thoughts or feature requests..."
              className="sm:col-span-2 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {feedbackSuccess ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {feedbackSuccess}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Feedback helps improve translation and tool accuracy.</span>
            )}
            <button
              type="submit"
              disabled={feedbackText.trim().length < 5 || sendingFeedback}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {sendingFeedback ? 'Sending...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
