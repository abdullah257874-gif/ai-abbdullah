import { AlertCircle, Bug, Check, Code2, Copy, FileCode2, RefreshCw, Wrench } from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { CodeModeId } from '../types';
import { SUPPORTED_GENERATION_LANGUAGES } from '../utils/i18n';

const CODE_LANGUAGES = [
  'HTML & CSS',
  'JavaScript',
  'TypeScript',
  'Python',
  'React (TSX)',
  'SQL',
  'Java / Kotlin',
  'C++',
];

const QUICK_EXAMPLES: { label: string; lang: string; prompt: string }[] = [
  {
    label: 'HTML + CSS Card',
    lang: 'HTML & CSS',
    prompt: 'Create a responsive pricing card component using semantic HTML5 and modern CSS Grid/Flexbox.',
  },
  {
    label: 'JavaScript Fetch',
    lang: 'JavaScript',
    prompt: 'Write an async JavaScript function with retry logic and timeout handling using AbortController.',
  },
  {
    label: 'Python Data Script',
    lang: 'Python',
    prompt: 'Write a clean Python script that reads a CSV file, filters invalid rows, and outputs summary statistics.',
  },
];

export const CodeAssistantPage: React.FC = () => {
  const { language, t } = useApp();

  const [mode, setMode] = useState<CodeModeId>('code_generate');
  const [codeLang, setCodeLang] = useState('JavaScript');
  const [explainLang, setExplainLang] = useState(
    language === 'ur' ? 'Urdu (اردو)' : 'English'
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.generateTool({
        tool: mode,
        prompt: input.trim(),
        language: explainLang,
        codeLanguage: codeLang,
      });
      setOutput(res.output);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code assistant request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی کوڈ اسسٹنٹ' : 'AI Code Studio'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Generate, explain, debug, and refactor HTML, CSS, JavaScript, TypeScript, and Python with copy-ready code blocks.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'code_generate', label: 'Generate Code', icon: Code2 },
            { id: 'code_explain', label: 'Explain Code', icon: FileCode2 },
            { id: 'code_debug', label: 'Debug Errors', icon: Bug },
            { id: 'code_improve', label: 'Improve Code', icon: Wrench },
          ] as { id: CodeModeId; label: string; icon: React.FC<{ className?: string }> }[]
        ).map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setError(null);
              }}
              className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <form
          onSubmit={handleRun}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Programming Stack
                </label>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                >
                  {CODE_LANGUAGES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Explanation Language
                </label>
                <select
                  value={explainLang}
                  onChange={(e) => setExplainLang(e.target.value)}
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

            {/* Starter Examples */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>Examples:</span>
              {QUICK_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setMode('code_generate');
                    setCodeLang(ex.lang);
                    setInput(ex.prompt);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {mode === 'code_generate'
                  ? 'Describe what you want to build'
                  : mode === 'code_debug'
                    ? 'Paste buggy code and error message'
                    : 'Paste your code snippet'}
              </label>
              <textarea
                rows={9}
                required
                dir="ltr"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === 'code_generate'
                    ? 'e.g., Build a responsive navbar in HTML/CSS or a binary search function in Python...'
                    : 'Paste code here...'
                }
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
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
            disabled={!input.trim() || loading}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
            <span>{loading ? 'Processing Code...' : 'Run Code Assistant'}</span>
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold">Solution &amp; Code Blocks</span>
            {output && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied') : 'Copy Full Output'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-44 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : output ? (
              <MarkdownRenderer content={output} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 text-sm text-slate-500 dark:text-slate-400">
                Select HTML, CSS, JavaScript, TypeScript, or Python and run the assistant to generate formatted code with copy buttons.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
