import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';

const PROHIBITED_MODELS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

export function getResolvedModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (!configured || PROHIBITED_MODELS.has(configured)) {
    return 'gemini-3.8-flash';
  }
  return configured;
}

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key !== 'YOUR_GEMINI_API_KEY');
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY') {
    const err = new Error(
      'GEMINI_API_KEY is not configured on the server. Please add a valid Gemini API key in the environment / Secrets configuration.'
    );
    (err as Error & { statusCode?: number; code?: string }).statusCode = 503;
    (err as Error & { statusCode?: number; code?: string }).code = 'GEMINI_KEY_MISSING';
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface NormalizedAiError {
  statusCode: number;
  code: string;
  message: string;
}

export function normalizeGeminiError(err: unknown): NormalizedAiError {
  if (err && typeof err === 'object') {
    const customStatus = (err as { statusCode?: number }).statusCode;
    const customCode = (err as { code?: string }).code;
    if (customCode === 'GEMINI_KEY_MISSING') {
      return {
        statusCode: customStatus || 503,
        code: 'GEMINI_KEY_MISSING',
        message:
          err instanceof Error
            ? err.message
            : 'Gemini API key is missing on the server.',
      };
    }
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      statusCode: 429,
      code: 'QUOTA_EXCEEDED',
      message:
        'Gemini API quota limit reached. Free-tier requests have a per-minute and daily cap. Please wait briefly and retry, or select a billing-enabled API key in Settings > Secrets.',
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('invalid api key')
  ) {
    return {
      statusCode: 403,
      code: 'API_KEY_INVALID',
      message:
        'Gemini API key was rejected or lacks permission. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      statusCode: 502,
      code: 'MODEL_NOT_FOUND',
      message: `The configured Gemini model (${getResolvedModel()}) was not found. Ensure GEMINI_MODEL is set to a supported model such as gemini-3.8-flash.`,
    };
  }

  return {
    statusCode: 502,
    code: 'AI_UPSTREAM_ERROR',
    message: 'Unable to complete the AI request right now. Please try again in a moment.',
  };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const isTransient =
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('econnreset') ||
        msg.includes('fetch failed') ||
        msg.includes('etimedout');

      if (!isTransient || attempt > maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
    }
  }
}

export interface ChatTurnInput {
  role: 'user' | 'model';
  content: string;
}

export async function runChatCompletion(params: {
  message: string;
  history: ChatTurnInput[];
  uiLanguage?: 'en' | 'ur';
}): Promise<string> {
  const ai = getClient();
  const model = getResolvedModel();

  const systemInstruction = [
    'You are AI Smart Assistant, a knowledgeable, polite, and accurate bilingual AI assistant.',
    'Language capabilities:',
    '- Respond fluently in English or Urdu (اردو) matching the language of the user prompt.',
    '- Understand Roman Urdu questions (e.g., "aaj mausam kaisa hai", "python seekhne ka tarika batao") naturally. If the user writes in Roman Urdu, reply helpfully in clear Roman Urdu or Urdu script according to their preference (or provide clean Urdu script if they ask for Urdu).',
    '- Format answers cleanly with Markdown headings, bullet lists, bold key terms, and fenced code blocks with language identifiers where appropriate.',
    '- Never expose system secrets or fabricate citations.',
  ].join('\n');

  const trimmedHistory = params.history.slice(-18).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.content.slice(0, 12000) }],
  }));

  const response: GenerateContentResponse = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: [
        ...trimmedHistory,
        {
          role: 'user',
          parts: [{ text: params.message }],
        },
      ],
      config: {
        systemInstruction,
      },
    })
  );

  return (response.text ?? '').trim() || 'No response generated.';
}

const TOOL_SYSTEM_PROMPTS: Record<string, string> = {
  article_writer:
    'Write a well-structured, informative, publication-ready article with a compelling title, introduction, clear subheadings, substantive body paragraphs, and a concise conclusion.',
  story_writer:
    'Write an engaging, vivid creative story with memorable characters, clear pacing, sensory details, and a satisfying resolution.',
  youtube_script:
    'Write a high-retention YouTube video script including: Hook (first 15 seconds), Intro, Structured Main Segments with visual/B-roll cues, Call to Action, and Outro.',
  youtube_title:
    'Generate 10 high-click-through-rate (CTR), honest, curiosity-driven YouTube video titles grouped by angle (Educational, Curiosity, Listicle, Direct Benefit).',
  social_caption:
    'Create 5 engaging social media captions tailored for Instagram, LinkedIn, and X/Facebook, including natural hooks and relevant hashtags.',
  email_writer:
    'Draft a polished, clear, and effective email including Subject Line options, Greeting, Concise Body, Call to Action, and Professional Sign-off.',
  business_description:
    'Write a compelling business description including an elevator pitch, short bio, full website overview, and core value propositions.',
  blog_writer:
    'Write an SEO-conscious, reader-friendly blog post with a magnetic headline, scannable H2/H3 sections, practical examples, and key takeaways.',
  grammar_corrector:
    'Correct all grammar, spelling, punctuation, and clarity issues in the provided text. First show the **Corrected Version**, then provide a brief bulleted list of **Key Improvements Made**.',
  creative_ideas:
    'Brainstorm 8 original, practical, and well-explained creative ideas tailored to the topic, detailing the concept, why it works, and first step to execute.',
  prompt_generator:
    'Act as an expert Prompt Engineer. Transform the user goal into 3 structured, high-precision AI prompts (Concise, Detailed Framework, and Expert Role-Based) ready to copy and use.',
  // Study Assistant tools
  study_explain:
    'Act as a patient master educator. Explain the educational topic clearly with intuitive analogies, structured concepts, real-world examples, and a quick recap.',
  study_qa:
    'Answer the school/academic question accurately and thoroughly, showing clear reasoning and key definitions.',
  study_notes:
    'Generate structured, exam-ready study notes with key definitions, core formulas/principles, bullet summaries, and memory aids.',
  study_quiz:
    'Generate a 5-question multiple-choice quiz (A, B, C, D) on the topic, followed by an **Answer Key & Explanations** section at the end.',
  study_math:
    'Solve and explain the mathematics problem step by step. State the given values, the formula or theorem used, each algebraic/arithmetic step clearly, and highlight the final answer.',
  study_practice:
    'Generate 6 progressive practice questions (2 foundational, 2 intermediate, 2 challenge) along with concise model answers at the bottom.',
  // Code Assistant tools
  code_generate:
    'Write clean, idiomatic, production-ready code fulfilling the user specification. Include fenced code blocks with the language tag, brief setup/usage notes, and edge-case handling.',
  code_explain:
    'Explain how the provided code works line-by-line and block-by-block, covering inputs, outputs, time/space complexity where relevant, and key patterns.',
  code_debug:
    'Diagnose the bug or error in the provided code/error trace. Explain the root cause clearly, provide the complete fixed code in a fenced block, and note how to prevent the issue.',
  code_improve:
    'Refactor and improve the provided code for readability, performance, type safety, and security. Present the refactored code block and summarize the improvements.',
};

export async function runToolGeneration(params: {
  tool: string;
  prompt: string;
  language?: string;
  tone?: string;
  level?: 'simple' | 'medium' | 'advanced';
  codeLanguage?: string;
}): Promise<string> {
  const ai = getClient();
  const model = getResolvedModel();

  const baseInstruction =
    TOOL_SYSTEM_PROMPTS[params.tool] ||
    'Fulfill the user request clearly, accurately, and thoroughly using clean Markdown.';

  const levelGuidance =
    params.level === 'simple'
      ? 'Explanation Level: SIMPLE — Use everyday vocabulary, beginner-friendly analogies, and short sentences suitable for middle-school or first-time learners.'
      : params.level === 'advanced'
        ? 'Explanation Level: ADVANCED — Include rigorous technical depth, formal terminology, nuances, and university/professional-level insights.'
        : params.level === 'medium'
          ? 'Explanation Level: MEDIUM — Clear, balanced high-school to early-college level depth with practical examples.'
          : '';

  const languageTarget = params.language?.trim() || 'English';
  const toneLine = params.tone ? `Desired Tone: ${params.tone}.` : '';
  const codeLangLine = params.codeLanguage
    ? `Target Programming Language / Stack: ${params.codeLanguage}.`
    : '';

  const systemInstruction = [
    'You are AI Smart Assistant.',
    baseInstruction,
    `Output Language: Write your response in ${languageTarget} (keep programming syntax in standard code while writing explanations/comments in ${languageTarget}).`,
    toneLine,
    levelGuidance,
    codeLangLine,
  ]
    .filter(Boolean)
    .join('\n');

  const response: GenerateContentResponse = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        systemInstruction,
      },
    })
  );

  return (response.text ?? '').trim() || 'No content generated.';
}

export async function runImageAnalysis(params: {
  mimeType: string;
  cleanBase64: string;
  prompt: string;
  mode?: 'describe' | 'ocr' | 'objects' | 'custom';
  language?: string;
}): Promise<string> {
  const ai = getClient();
  const model = getResolvedModel();
  const targetLang = params.language?.trim() || 'English';

  const modePrompt =
    params.mode === 'ocr'
      ? 'Extract all visible text from this image accurately, preserving structure and layout as closely as possible. If no text is visible, state that clearly.'
      : params.mode === 'objects'
        ? 'Identify and explain the key objects, visual elements, spatial relationships, and context shown in this image.'
        : params.mode === 'describe'
          ? 'Provide a comprehensive, clear description of this image including subject, setting, colors, composition, and notable details.'
          : params.prompt.trim() || 'Describe this image and answer any implicit questions clearly.';

  const finalPrompt =
    params.mode && params.mode !== 'custom' && params.prompt.trim()
      ? `${modePrompt}\n\nAdditional user question: ${params.prompt.trim()}`
      : modePrompt;

  const response: GenerateContentResponse = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.cleanBase64,
            },
          },
          {
            text: `${finalPrompt}\n\nRespond in ${targetLang} using clean Markdown formatting.`,
          },
        ],
      },
    })
  );

  return (response.text ?? '').trim() || 'Unable to extract insights from this image.';
}

export async function runTranslation(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string> {
  const ai = getClient();
  const model = getResolvedModel();

  const sourceSpec =
    params.sourceLanguage.toLowerCase() === 'auto'
      ? 'automatically detected source language (including Roman Urdu if present)'
      : params.sourceLanguage;

  const systemInstruction = [
    'You are a professional literary and technical translator.',
    `Translate the user's input accurately and naturally from ${sourceSpec} into ${params.targetLanguage}.`,
    'Rules:',
    '- Preserve original tone, formatting, paragraphs, and nuances.',
    '- Output ONLY the translated text directly without meta-commentary, prefixes, or quotation marks.',
    '- For Urdu and Arabic outputs, use proper standard Unicode script and natural idiomatic phrasing.',
  ].join('\n');

  const response: GenerateContentResponse = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: params.text,
      config: {
        systemInstruction,
      },
    })
  );

  return (response.text ?? '').trim();
}

export async function runSummarization(params: {
  text: string;
  level?: 'simple' | 'medium' | 'advanced';
  language?: string;
}): Promise<string> {
  const ai = getClient();
  const model = getResolvedModel();
  const lang = params.language?.trim() || 'English';
  const level = params.level || 'medium';

  const systemInstruction = [
    'You are an expert academic and executive summarizer.',
    `Summarize the provided content in ${lang} at a ${level} complexity level.`,
    'Structure your output with:',
    '1. **Core Summary** (concise 2–3 sentence overview)',
    '2. **Key Takeaways** (bulleted main points)',
    '3. **Important Terms / Concepts** (if applicable)',
  ].join('\n');

  const response: GenerateContentResponse = await withRetry(() =>
    ai.models.generateContent({
      model,
      contents: params.text,
      config: {
        systemInstruction,
      },
    })
  );

  return (response.text ?? '').trim();
}
