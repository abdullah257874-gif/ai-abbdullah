import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  FileText,
  ImagePlus,
  Layers,
  MessageSquare,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { SUPPORTED_GENERATION_LANGUAGES } from '../utils/i18n';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

type VisionMode = 'describe' | 'ocr' | 'objects' | 'custom';

export const ImageVisionPage: React.FC = () => {
  const { language, t } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeKb, setFileSizeKb] = useState<number>(0);

  const [mode, setMode] = useState<VisionMode>('describe');
  const [prompt, setPrompt] = useState('');
  const [outputLang, setOutputLang] = useState(language === 'ur' ? 'Urdu (اردو)' : 'English');

  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const processSelectedFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported image format. Please choose a PNG, JPEG, WEBP, or GIF image.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('Selected image exceeds the 4 MB upload limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setError('Unable to read image file.');
        return;
      }
      setImagePreview(result);
      setImageMime(file.type);
      setFileName(file.name);
      setFileSizeKb(Math.round(file.size / 1024));
      setAnalysis('');
    };
    reader.onerror = () => setError('Failed to read selected file.');
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageMime('');
    setFileName('');
    setFileSizeKb(0);
    setAnalysis('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!imagePreview || !imageMime || loading) return;

    if (mode === 'custom' && !prompt.trim()) {
      setError('Please enter a question about the uploaded image.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeImage({
        mimeType: imageMime,
        imageBase64: imagePreview,
        prompt: prompt.trim(),
        mode,
        language: outputLang,
      });
      setAnalysis(res.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {language === 'ur' ? 'اے آئی تصویری تجزیہ' : 'AI Image Understanding'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Upload an image (JPEG, PNG, WEBP, or GIF up to 4 MB) to describe scenes, extract visible text, explain objects, or ask custom questions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Upload & Controls */}
        <form
          onSubmit={handleAnalyze}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  processSelectedFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/60 dark:bg-slate-950/40"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <ImagePlus className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Click to choose an image or drag and drop here
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  PNG, JPG, WEBP, or GIF · Maximum size 4 MB
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-950/5 dark:bg-slate-950">
                <div className="relative max-h-64 flex items-center justify-center p-3">
                  <img
                    src={imagePreview}
                    alt={fileName || 'Uploaded preview'}
                    referrerPolicy="no-referrer"
                    className="max-h-56 w-auto object-contain rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[70%] tabular-nums">
                    {fileName} · {fileSizeKb} KB
                  </span>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => processSelectedFile(e.target.files?.[0])}
              className="hidden"
            />

            {/* Analysis Mode Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Analysis Task
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'describe', label: 'Describe Image', icon: Eye },
                    { id: 'ocr', label: 'Extract Text (OCR)', icon: FileText },
                    { id: 'objects', label: 'Explain Objects', icon: Layers },
                    { id: 'custom', label: 'Ask Question', icon: MessageSquare },
                  ] as { id: VisionMode; label: string; icon: React.FC<{ className?: string }> }[]
                ).map((item) => {
                  const Icon = item.icon;
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
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
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {mode === 'custom'
                  ? 'Your Question About the Image (Required)'
                  : 'Optional Specific Question or Focus'}
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., What formula is written on this whiteboard?"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
            disabled={!imagePreview || loading}
            className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            <span>{loading ? 'Analyzing Image...' : 'Analyze Image'}</span>
          </button>
        </form>

        {/* Analysis Result */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold">Vision Insights</span>
            {analysis && (
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied') : t('copy')}</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                <div className="h-5 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            ) : analysis ? (
              <MarkdownRenderer content={analysis} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 text-sm text-slate-500 dark:text-slate-400">
                Upload an image and click Analyze Image to inspect objects, scenes, or visible text.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
