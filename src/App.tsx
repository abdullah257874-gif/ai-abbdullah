/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppShell } from './components/AppShell';
import { AuthModal } from './components/AuthModal';
import { OfflineBanner } from './components/OfflineBanner';
import { AppProvider, useApp } from './context/AppContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ChatPage } from './pages/ChatPage';
import { CodeAssistantPage } from './pages/CodeAssistantPage';
import { HomeDashboard } from './pages/HomeDashboard';
import { ImageVisionPage } from './pages/ImageVisionPage';
import { ProfilePage } from './pages/ProfilePage';
import { PromptGeneratorPage } from './pages/PromptGeneratorPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudyAssistantPage } from './pages/StudyAssistantPage';
import { TranslatorPage } from './pages/TranslatorPage';
import { WritingToolsPage } from './pages/WritingToolsPage';

const ActiveRouteView: React.FC = () => {
  const { view } = useApp();

  switch (view) {
    case 'dashboard':
      return <HomeDashboard />;
    case 'chat':
      return <ChatPage />;
    case 'writing':
      return <WritingToolsPage />;
    case 'image':
      return <ImageVisionPage />;
    case 'translate':
      return <TranslatorPage />;
    case 'study':
      return <StudyAssistantPage />;
    case 'code':
      return <CodeAssistantPage />;
    case 'prompt':
      return <PromptGeneratorPage />;
    case 'settings':
      return <SettingsPage />;
    case 'profile':
      return <ProfilePage />;
    case 'admin':
      return <AdminDashboardPage />;
    default:
      return <HomeDashboard />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <ActiveRouteView />
      </AppShell>
      <AuthModal />
      <OfflineBanner />
    </AppProvider>
  );
}
