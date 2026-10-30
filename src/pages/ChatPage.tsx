import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  History,
  MessageSquarePlus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { ChatMessage } from '../types';
import { containsRtlScript } from '../utils/i18n';

export const ChatPage: React.FC = () => {
  const {
    user,
    setAuthModalOpen,
    conversations,
    refreshConversations,
    activeConversationId,
    setActiveConversationId,
    pendingChatPrompt,
    clearPendingChatPrompt,
    language,
    t,
  } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoScrollEnabled = user?.preferences?.autoScroll ?? true;

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScrollEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  // Load selected conversation messages when activeConversationId changes
  useEffect(() => {
    if (!user || !activeConversationId) {
      if (!activeConversationId) {
        setMessages([]);
      }
      return;
    }

    let cancelled = false;
    setLoadingThread(true);
    setError(null);

    api
      .getConversation(activeConversationId)
      .then((res) => {
        if (!cancelled) {
          setMessages(res.messages);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load conversation.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, activeConversationId]);

  const sendMessage = useCallback(
    async (textToSend: string, options?: { isRegenerate?: boolean }) => {
      const trimmed = textToSend.trim();
      if (!trimmed || sending) return;

      setError(null);
      setLastFailedMessage(null);
      setSending(true);

      const currentHistory = options?.isRegenerate
        ? messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
        : messages.map((m) => ({ role: m.role, content: m.content }));

      const tempUserMsg: ChatMessage = {
        messageId: `local_u_${Date.now()}`,
        conversationId: activeConversationId || 'guest',
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      if (options?.isRegenerate) {
        setMessages((prev) =>
          prev.at(-1)?.role === 'model' ? prev.slice(0, -1) : prev
        );
      } else {
        setMessages((prev) => [...prev, tempUserMsg]);
      }

      try {
        const res = await api.sendChat({
          message: trimmed,
          history: currentHistory,
          conversationId: user ? activeConversationId : null,
          regenerate: options?.isRegenerate,
          uiLanguage: language,
        });

        const modelMsg: ChatMessage = res.modelMessage || {
          messageId: `local_m_${Date.now()}`,
          conversationId: res.conversation?.conversationId || 'guest',
          role: 'model',
          content: res.reply,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          if (res.userMessage && !options?.isRegenerate) {
            return [...prev.slice(0, -1), res.userMessage, modelMsg];
          }
          return [...prev, modelMsg];
        });

        if (user && res.conversation) {
          setActiveConversationId(res.conversation.conversationId);
          await refreshConversations();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to receive AI response.');
        setLastFailedMessage(trimmed);
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, language, messages, refreshConversations, sending, setActiveConversationId, user]
  );

  // Consume initial prompt sent from HomeDashboard
  useEffect(() => {
    if (pendingChatPrompt) {
      const prompt = pendingChatPrompt;
      clearPendingChatPrompt();
      sendMessage(prompt);
    }
  }, [pendingChatPrompt, clearPendingChatPrompt, sendMessage]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input;
    setInput('');
    sendMessage(text);
  };

  const handleRegenerate = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        sendMessage(messages[i].content, { isRegenerate: true });
        break;
      }
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setLastFailedMessage(null);
    setHistoryDrawerOpen(false);
  };

  const saveRename = async (convId: string) => {
    if (!editingTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    try {
      await api.renameConversation(convId, editingTitle.trim());
      await refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to rename conversation.');
    } finally {
      setEditingConvId(null);
    }
  };

  const confirmDelete = async (convId: string) => {
    try {
      await api.deleteConversation(convId);
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete conversation.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={startNewChat}
          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>{t('startNewChat')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {!user ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400 space-y-2.5">
            <p>Sign in to save, rename, and revisit private conversations across devices.</p>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              {t('signIn')}
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <p className="p-3 text-xs text-slate-500 dark:text-slate-400">
            {t('noConversationsYet')}
          </p>
        ) : (
          conversations.map((conv) => {
            const isSelected = activeConversationId === conv.conversationId;
            return (
              <div
                key={conv.conversationId}
                className={`group rounded-xl p-2 transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                }`}
              >
                {editingConvId === conv.conversationId ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(conv.conversationId);
                        if (e.key === 'Escape') setEditingConvId(null);
                      }}
                      autoFocus
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-blue-500 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => saveRename(conv.conversationId)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      aria-label="Save title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingConvId(null)}
                      className="p-1.5 rounded-lg text-slate-500"
                      aria-label="Cancel rename"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : confirmDeleteId === conv.conversationId ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-red-600 dark:text-red-400 font-medium truncate">
                      Delete chat?
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => confirmDelete(conv.conversationId)}
                        className="px-2 py-1 rounded-md bg-red-600 text-white font-medium cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversationId(conv.conversationId);
                        setHistoryDrawerOpen(false);
                      }}
                      className="flex-1 min-w-0 text-left py-1 px-1 cursor-pointer"
                    >
                      <p className="text-xs font-medium truncate">{conv.title}</p>
                    </button>
                    <div className="flex items-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingConvId(conv.conversationId);
                          setEditingTitle(conv.title);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
                        aria-label="Rename conversation"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(conv.conversationId)}
                        className="p-1.5 rounded-lg hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem-3.5rem)] lg:h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* Desktop Conversation History Column */}
      <div className="hidden md:block w-64 shrink-0 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {renderConversationList()}
      </div>

      {/* Mobile Conversation History Drawer */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setHistoryDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[82vw] bg-white dark:bg-slate-900 h-full border-e border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-semibold">Conversations</span>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{renderConversationList()}</div>
          </div>
        </div>
      )}

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        {/* Mobile History Sub-Toolbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setHistoryDrawerOpen(true)}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({conversations.length})</span>
          </button>
          <button
            type="button"
            onClick={startNewChat}
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Scrollable Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-5">
            {loadingThread ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-20 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60 animate-pulse"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="py-10 text-center space-y-5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {language === 'ur'
                    ? 'انگریزی، اردو یا رومن اردو میں گفتگو شروع کریں'
                    : 'Ask anything in English, Urdu, or Roman Urdu'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                  Multi-turn context is maintained automatically. Code blocks, math steps, and Urdu script are formatted cleanly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                  {[
                    'Explain how React hooks work with a clean example',
                    'مصنوعی ذہانت مستقبل میں تعلیم کو کیسے بدلے گی؟',
                    'Mujhe freelancing shuru karne ke 5 practical steps batao',
                    'Create a 7-day study schedule for final exams',
                  ].map((promptText) => {
                    const rtl = containsRtlScript(promptText);
                    return (
                      <button
                        key={promptText}
                        type="button"
                        dir={rtl ? 'rtl' : 'ltr'}
                        onClick={() => sendMessage(promptText)}
                        className={`p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors cursor-pointer ${
                          rtl ? 'font-urdu text-right' : 'text-left'
                        }`}
                      >
                        {promptText}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isRtl = containsRtlScript(msg.content);
                const isLastModel = !isUser && idx === messages.length - 1;

                return (
                  <div
                    key={msg.messageId}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3.5 ${
                        isUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {isUser ? (
                        <p
                          dir={isRtl ? 'rtl' : 'ltr'}
                          className={`text-[15px] whitespace-pre-wrap leading-relaxed ${
                            isRtl ? 'font-urdu text-right' : 'text-left'
                          }`}
                        >
                          {msg.content}
                        </p>
                      ) : (
                        <>
                          <MarkdownRenderer content={msg.content} />
                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.messageId, msg.content)}
                              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === msg.messageId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedId === msg.messageId ? t('copied') : t('copy')}</span>
                            </button>

                            {isLastModel && !sending && (
                              <button
                                type="button"
                                onClick={handleRegenerate}
                                className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{t('regenerate')}</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing / Loading Indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Generating response...</span>
                </div>
              </div>
            )}

            {/* Error Banner + Retry Button */}
            {error && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {lastFailedMessage && (
                  <button
                    type="button"
                    onClick={() => sendMessage(lastFailedMessage)}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('retry')}</span>
                  </button>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Sticky Composer Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4">
          <form onSubmit={handleFormSubmit} className="max-w-3xl mx-auto flex items-end gap-2.5">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit(e);
                }
              }}
              dir={containsRtlScript(input) ? 'rtl' : 'ltr'}
              placeholder={t('quickChatPlaceholder')}
              className={`flex-1 min-h-[46px] max-h-36 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y ${
                containsRtlScript(input) ? 'font-urdu text-right' : ''
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="min-h-[46px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('send')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
