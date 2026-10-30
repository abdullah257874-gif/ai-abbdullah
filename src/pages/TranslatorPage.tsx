import { AlertCircle, ArrowLeftRight, Check, Copy, Languages, RefreshCw, X } from 'lucide-react';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { containsRtlScript, TRANSLATION_LANGUAGES } from '../utils/i18n';

const RTL_LANG_CODES = new Set(['Urdu', 'Arabic', 'Persian', 'Punjabi', 'Pashto']);

export const TranslatorPage: React.FC = () => {
  const { language, t } = useApp();

  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Urdu');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSwap = () => {
    if (sourceLang === 'Auto') {
      setSourceLang(targetLang);
      setTargetLang('English');
    } else {
      const prevSource = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(prevSource);
    }
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sourceText.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.translate({
        text: sourceText.trim(),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      setTranslatedText(res.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    await navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const sourceIsRtl = RTL_LANG_CODES.has(sourceLang) || containsRtlScript(sourceText);
  const targetIsRtl = RTL_LANG_CODES.has(targetLang) || containsRtlScript(translatedText);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی مترجم' : 'AI Multilingual Translator'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Translate naturally between English, Urdu, Hindi, Arabic, and 8+ global languages with full Unicode and RTL formatting.
        </p>
      </div>

      {/* Language Selector Bar */}
      <form onSubmit={handleTranslate} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="sr-only">Source Language</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
            >
              {TRANSLATION_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            aria-label="Swap source and target languages"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="sm:hidden">Swap Languages</span>
          </button>

          <div className="flex-1">
            <label className="sr-only">Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
            >
              {TRANSLATION_LANGUAGES.filter((l) => l.code !== 'Auto').map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!sourceText.trim() || loading}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            <span>{loading ? 'Translating...' : 'Translate'}</span>
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Dual Text Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Input Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Source Text ({sourceLang})
              </span>
              {sourceText && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceText('');
                    setTranslatedText('');
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t('clear')}</span>
                </button>
              )}
            </div>

            <textarea
              rows={9}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              dir={sourceIsRtl ? 'rtl' : 'ltr'}
              placeholder="Enter or paste text to translate (English, Urdu, Roman Urdu, Arabic, Hindi...)"
              className={`flex-1 w-full bg-transparent text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none ${
                sourceIsRtl ? 'font-urdu text-right' : 'text-left'
              }`}
            />

            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 tabular-nums">
              <span>{sourceText.length} / 12,000 characters</span>
            </div>
          </div>

          {/* Output Panel */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Translation ({targetLang})
              </span>
              {translatedText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t('copied') : t('copy')}</span>
                </button>
              )}
            </div>

            <div className="flex-1 min-h-[216px]">
              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="h-5 w-4/5 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-5 w-2/3 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="h-5 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : translatedText ? (
                <p
                  dir={targetIsRtl ? 'rtl' : 'ltr'}
                  className={`text-base whitespace-pre-wrap text-slate-900 dark:text-slate-100 ${
                    targetIsRtl ? 'font-urdu text-right text-lg' : 'text-left leading-relaxed'
                  }`}
                >
                  {translatedText}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Translation output will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
