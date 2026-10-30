import { AlertCircle, Check, Copy, RefreshCw, WandSparkles } from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SUPPORTED_GENERATION_LANGUAGES } from '../utils/i18n';

export const PromptGeneratorPage: React.FC = () => {
  const { language, t } = useApp();
  const [goal, setGoal] = useState('');
  const [domain, setDomain] = useState('Software Engineering & Productivity');
  const [outputLang, setOutputLang] = useState(language === 'ur' ? 'Urdu (اردو)' : 'English');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goal.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.generateTool({
        tool: 'prompt_generator',
        prompt: `Domain: ${domain}\nUser Goal: ${goal.trim()}`,
        language: outputLang,
      });
      setOutput(res.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate prompts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی پرامپٹ جنریٹر' : 'AI Prompt Generator'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Transform rough ideas into structured Concise, Framework, and Role-Based AI prompts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                >
                  {[
                    'Software Engineering & Productivity',
                    'Content Creation & Marketing',
                    'Academic Research & Education',
                    'Business Strategy & Analysis',
                    'Visual Design & Storytelling',
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Prompt Language
                </label>
                <select
                  value={outputLang}
                  onChange={(e) => setOutputLang(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                >
                  {SUPPORTED_GENERATION_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                What do you want the AI to help you achieve?
              </label>
              <textarea
                rows={6}
                required
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Help me design a 30-day marketing launch plan for a local artisanal bakery with zero ad budget..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!goal.trim() || loading}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <WandSparkles className="w-4 h-4" />
            )}
            <span>{loading ? 'Engineering Prompts...' : 'Generate Prompts'}</span>
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold">Engineered Prompts</span>
            {output && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={loading}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
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
              <div className="space-y-3">
                <div className="h-5 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : output ? (
              <MarkdownRenderer content={output} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 text-sm text-slate-500 dark:text-slate-400">
                Describe your goal to generate 3 copy-ready prompts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
