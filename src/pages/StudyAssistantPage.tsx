import {
  AlertCircle,
  BookOpen,
  Calculator,
  Check,
  ClipboardList,
  Copy,
  FileSpreadsheet,
  HelpCircle,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import React, { useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { ExplanationLevel, StudyModeId } from '../types';
import { containsRtlScript, SUPPORTED_GENERATION_LANGUAGES } from '../utils/i18n';

const STUDY_MODES: {
  id: StudyModeId;
  label: string;
  placeholder: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'study_explain',
    label: 'Explain Topic',
    placeholder: 'e.g., Explain Newton’s Three Laws of Motion with everyday examples...',
    icon: BookOpen,
  },
  {
    id: 'study_qa',
    label: 'School Q&A',
    placeholder: 'Paste your homework or textbook question here...',
    icon: HelpCircle,
  },
  {
    id: 'study_notes',
    label: 'Study Notes',
    placeholder: 'Enter a chapter title or topic to generate structured revision notes...',
    icon: ClipboardList,
  },
  {
    id: 'study_quiz',
    label: 'MCQ Quiz',
    placeholder: 'Enter a subject or topic to generate a 5-question multiple-choice quiz...',
    icon: ListChecks,
  },
  {
    id: 'study_math',
    label: 'Step-by-Step Math',
    placeholder: 'e.g., Solve 3x² - 12x + 9 = 0 step by step...',
    icon: Calculator,
  },
  {
    id: 'summarize',
    label: 'Summarize Content',
    placeholder: 'Paste a lecture transcript, textbook passage, or article to summarize...',
    icon: FileSpreadsheet,
  },
  {
    id: 'study_practice',
    label: 'Practice Questions',
    placeholder: 'Enter an exam topic to generate progressive practice questions and answers...',
    icon: ListChecks,
  },
];

export const StudyAssistantPage: React.FC = () => {
  const { language, user, t } = useApp();

  const [mode, setMode] = useState<StudyModeId>('study_explain');
  const [level, setLevel] = useState<ExplanationLevel>(
    user?.preferences?.explanationLevel || 'medium'
  );
  const [outputLang, setOutputLang] = useState(
    user?.preferences?.defaultToolLanguage || (language === 'ur' ? 'Urdu (اردو)' : 'English')
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeMode = STUDY_MODES.find((m) => m.id === mode) || STUDY_MODES[0];

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      if (mode === 'summarize') {
        const res = await api.summarize({
          text: input.trim(),
          level,
          language: outputLang,
        });
        setOutput(res.summary);
      } else {
        const res = await api.generateTool({
          tool: mode,
          prompt: input.trim(),
          level,
          language: outputLang,
        });
        setOutput(res.output);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Study assistant request failed.');
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی تعلیمی معاون' : 'AI Study Assistant'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Master subjects with Simple, Medium, or Advanced explanations, revision notes, quizzes, summaries, and step-by-step math.
        </p>
      </div>

      {/* Study Mode Tabs */}
      <div className="flex flex-wrap gap-2">
        {STUDY_MODES.map((item) => {
          const Icon = item.icon;
          const active = item.id === mode;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setError(null);
              }}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
        {/* Study Input Form */}
        <form
          onSubmit={handleRun}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            {/* Explanation Level Segmented Control */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Explanation Level
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                {(['simple', 'medium', 'advanced'] as ExplanationLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      level === lvl
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Output Language
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

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {activeMode.label} Input
              </label>
              <textarea
                rows={7}
                required
                value={input}
                onChange={(e) => setInput(e.target.value)}
                dir={containsRtlScript(input) ? 'rtl' : 'ltr'}
                placeholder={activeMode.placeholder}
                className={`w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  containsRtlScript(input) ? 'font-urdu text-right' : ''
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

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            <span>{loading ? 'Preparing Study Guide...' : t('generate')}</span>
          </button>
        </form>

        {/* Study Output */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold">
              {activeMode.label} · <span className="capitalize font-normal text-slate-500">{level}</span>
            </span>
            {output && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRun()}
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
                <div className="h-5 w-3/5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-11/12 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : output ? (
              <MarkdownRenderer content={output} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 text-sm text-slate-500 dark:text-slate-400">
                Choose a study task and explanation depth to generate tailored learning material.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
