import {
  BookOpen,
  Code2,
  FilePenLine,
  Globe2,
  Home,
  Image as ImageIcon,
  Languages,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  UserCircle2,
  WandSparkles,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AppView } from '../types';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
}

const SIDEBAR_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: Home },
  { id: 'chat', labelKey: 'chat', icon: MessageSquare },
  { id: 'writing', labelKey: 'writing', icon: FilePenLine },
  { id: 'image', labelKey: 'image', icon: ImageIcon },
  { id: 'translate', labelKey: 'translate', icon: Languages },
  { id: 'study', labelKey: 'study', icon: BookOpen },
  { id: 'code', labelKey: 'code', icon: Code2 },
  { id: 'prompt', labelKey: 'prompt', icon: WandSparkles },
  { id: 'settings', labelKey: 'settings', icon: SettingsIcon },
  { id: 'profile', labelKey: 'profile', icon: UserCircle2 },
  { id: 'admin', labelKey: 'admin', icon: ShieldCheck, adminOnly: true },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    view,
    navigate,
    user,
    setAuthModalOpen,
    theme,
    setTheme,
    language,
    setLanguage,
    t,
    logout,
  } = useApp();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const visibleItems = SIDEBAR_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  );

  const handleNavClick = (target: AppView) => {
    navigate(target);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Compliant 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-8 px-4 lg:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        {/* Zone 1: Single-line Brand Wordmark (with mobile menu button on small screens) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BrandLogo size="sm" label={t('appName')} />
          </button>
        </div>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {(['dashboard', 'chat', 'writing', 'translate', 'study'] as AppView[]).map((navId) => (
            <button
              key={navId}
              type="button"
              onClick={() => handleNavClick(navId)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                view === navId
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t(navId)}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => navigate('chat', { conversationId: null })}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t('startNewChat')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t('signIn')}
            </button>
          )}
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop Sidebar (264px) */}
        <aside className="hidden lg:flex lg:w-[264px] shrink-0 flex-col justify-between border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Sidebar Workspace Controls (Theme, Language, Install, Account) */}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <PWAInstallButton compact />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>

              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
                className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'اردو' : 'English'}</span>
              </button>
            </div>

            {user ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleNavClick('profile')}
                  className="min-w-0 text-left cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  aria-label={t('signOut')}
                  title={t('signOut')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Guest session active · Private history not stored.
              </p>
            )}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[82vw] bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between overflow-y-auto border-e border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <BrandLogo size="sm" label={t('appName')} />
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <PWAInstallButton />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <Globe2 className="w-4 h-4" />
                    <span>{language === 'en' ? 'اردو' : 'English'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Scrollable Content Area */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-8">{children}</main>
      </div>

      {/* Mobile Ergonomic Bottom Navigation Bar (5 destinations, <=15% sticky viewport budget) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          {(
            [
              { id: 'dashboard', icon: Home, label: t('dashboard') },
              { id: 'chat', icon: MessageSquare, label: t('chat') },
              { id: 'writing', icon: FilePenLine, label: t('writing') },
              { id: 'translate', icon: Languages, label: t('translate') },
              { id: 'settings', icon: SettingsIcon, label: t('settings') },
            ] as { id: AppView; icon: React.FC<{ className?: string }>; label: string }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavClick(tab.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
