import { AlertCircle, CheckCircle2, Lock, LogOut, Save, UserCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { ExplanationLevel } from '../types';
import { SUPPORTED_GENERATION_LANGUAGES } from '../utils/i18n';

export const ProfilePage: React.FC = () => {
  const { user, setUser, setAuthModalOpen, logout, updatePreferences, t } = useApp();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [defaultLang, setDefaultLang] = useState(
    user?.preferences?.defaultToolLanguage || 'English'
  );
  const [defaultLevel, setDefaultLevel] = useState<ExplanationLevel>(
    user?.preferences?.explanationLevel || 'medium'
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(user?.preferences?.autoScroll ?? true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setDefaultLang(user.preferences?.defaultToolLanguage || 'English');
      setDefaultLevel(user.preferences?.explanationLevel || 'medium');
      setAutoScroll(user.preferences?.autoScroll ?? true);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <UserCircle2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Guest Session Active
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            You can test AI Chat, Writing, Vision, Translation, Study, and Code tools right away as a guest. Create an account or sign in to save private conversation history and sync personal preferences.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {t('signIn')} / {t('register')}
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.updateProfile({ displayName: displayName.trim() });
      setUser(res.user);
      await updatePreferences({
        defaultToolLanguage: defaultLang,
        explanationLevel: defaultLevel,
        autoScroll,
      });
      setStatusMsg('Profile and preferences saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setStatusMsg('Password updated successfully.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account &amp; Profile</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {user.email} · Joined {new Date(user.createdAt).toLocaleDateString()} · Role: {user.role}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold inline-flex items-center gap-2 self-start cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile & Preferences Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Personal Details &amp; AI Defaults
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address (Verified Identifier)
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Default AI Tool Output Language
            </label>
            <select
              value={defaultLang}
              onChange={(e) => setDefaultLang(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            >
              {SUPPORTED_GENERATION_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Default Study Explanation Depth
            </label>
            <select
              value={defaultLevel}
              onChange={(e) => setDefaultLevel(e.target.value as ExplanationLevel)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm capitalize"
            >
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Automatically scroll to latest AI messages in Chat
          </span>
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>

      {/* Password Update Form */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Update Password
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              New Password (8+ characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPassword}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold transition-opacity hover:opacity-90 cursor-pointer"
        >
          {savingPassword ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};
