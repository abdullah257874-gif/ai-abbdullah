import { AlertCircle, Check, Copy, FilePenLine, RefreshCw, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { WritingToolId } from '../types';
import {
  containsRtlScript,
  SUPPORTED_GENERATION_LANGUAGES,
  WRITING_TOOLS,
} from '../utils/i18n';

const TONES = ['Professional', 'Conversational', 'Persuasive', 'Academic', 'Creative', 'Formal'];

export const WritingToolsPage: React.FC = () => {
  const { language, user, t } = useApp();

  const [selectedToolId, setSelectedToolId] = useState<WritingToolId>('article_writer');
  const [prompt, setPrompt] = useState('');
  const [outputLang, setOutputLang] = useState(
    user?.preferences?.defaultToolLanguage || (language === 'ur' ? 'Urdu (اردو)' : 'English')
  );
  const [tone, setTone] = useState('Professional');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeTool =
    WRITING_TOOLS.find((tool) => tool.id === selectedToolId) || WRITING_TOOLS[0];

  const runGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.generateTool({
        tool: selectedToolId,
        prompt: prompt.trim(),
        language: outputLang,
        tone,
      });
      setOutput(res.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی تحریری ٹولز' : 'AI Writing Studio'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Select any of the 10 specialized writing tools below, choose your output language and tone, and generate publication-ready copy.
        </p>
      </div>

      {/* 10 Writing Tools Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {WRITING_TOOLS.map((tool) => {
          const active = tool.id === selectedToolId;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setSelectedToolId(tool.id);
                setError(null);
              }}
              className={`min-h-[48px] p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <p className="text-xs font-semibold truncate">
                {language === 'ur' ? tool.titleUr : tool.titleEn}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {language === 'ur' ? tool.descUr : tool.descEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Workspace Split: Input Configuration vs AI Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Tool Form */}
        <form
          onSubmit={runGenerate}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <FilePenLine className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {language === 'ur' ? activeTool.titleUr : activeTool.titleEn}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'ur' ? activeTool.descUr : activeTool.descEn}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Output Language
                </label>
                <select
                  value={outputLang}
                  onChange={(e) => setOutputLang(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {SUPPORTED_GENERATION_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Writing Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {TONES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Topic, Draft, or Instructions
              </label>
              <textarea
                rows={7}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                dir={containsRtlScript(prompt) ? 'rtl' : 'ltr'}
                placeholder={
                  language === 'ur' ? activeTool.placeholderUr : activeTool.placeholderEn
                }
                className={`w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  containsRtlScript(prompt) ? 'font-urdu text-right' : ''
                }`}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Generating...' : t('generate')}</span>
            </button>

            {prompt && (
              <button
                type="button"
                onClick={() => {
                  setPrompt('');
                  setOutput('');
                  setError(null);
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t('clear')}
              </button>
            )}
          </div>
        </form>

        {/* Right: Generated Output */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Generated Output
            </span>
            {output && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runGenerate()}
                  disabled={loading}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{t('regenerate')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t('copied') : t('copy')}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 py-2">
                <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-11/12 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse mt-4" />
              </div>
            ) : output ? (
              <MarkdownRenderer content={output} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  Enter your topic or draft on the left and press Generate to create polished content.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
