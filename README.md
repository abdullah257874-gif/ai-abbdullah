# AI Smart Assistant

A bilingual (English & Urdu) full-stack AI Smart Assistant built with React 19, TypeScript, Tailwind CSS v4, Express, Google Gemini (`@google/genai`), Progressive Web App (PWA) support, and Capacitor Android configuration (`com.aismartassistant.app`).

## Key Capabilities

- **AI Chat System**: Multi-turn context, English, Urdu (`اردو`), and Roman Urdu comprehension, conversation history (create, rename, delete, clear), Markdown & syntax-formatted code blocks, copy, regenerate, and error retry.
- **10 AI Writing Tools + Prompt Generator**: Article Writer, Story Writer, YouTube Script Generator, YouTube Title Generator, Social Media Captions, Email Writer, Business Description, Blog Writer, Grammar Corrector, Creative Idea Generator, and Prompt Generator.
- **AI Image Understanding**: Drag-and-drop image upload (PNG, JPG, WEBP, GIF up to 4 MB), scene description, OCR text extraction, object explanation, and custom visual Q&A.
- **AI Translator**: 12+ languages including English, Urdu, Hindi, Arabic, Persian, Pashto, and Punjabi with native RTL rendering and language swap.
- **AI Study Assistant**: Simple, Medium, and Advanced explanation depths for topics, school Q&A, study notes, MCQ quizzes, step-by-step math, summaries, and practice questions.
- **AI Code Studio**: Generate, explain, debug, and refactor HTML, CSS, JavaScript, TypeScript, and Python.
- **Authentication & Security**: Salted `scrypt` password hashing, HMAC-SHA256 signed session tokens, password reset flow, Guest trial mode, sliding-window rate limiting, and server-side RBAC Admin Console.

---

## 1. Environment Setup (`.env`)

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` (generated free from Google AI Studio) and `SESSION_SECRET` on the backend. Never add a `VITE_` prefix to `GEMINI_API_KEY`.

## 2. Local Development & Testing

```bash
npm install
npm run dev        # Starts full-stack Express + Vite server on http://localhost:3000
npm run lint       # TypeScript type-checking
npm run build      # Builds production frontend + PWA service worker into dist/
node --test tests/app.test.ts
```

## 3. Authentication & Firebase Notes

When Firebase setup is declined or Firebase credentials (`VITE_FIREBASE_*`) are not provided, the app runs transparently in **Zero-Cost Self-Hosted Encrypted Mode** (`data/assistant-db.json` with `scrypt` password hashes and strict per-user isolation) without pretending cloud Firebase is connected. To connect an external Firebase project later, enable Authentication (Email/Password) and Cloud Firestore (Spark free tier) in the Firebase Console and supply the `VITE_FIREBASE_*` keys in `.env`.

## 4. Generating an Android APK with Capacitor & Android Studio

`capacitor.config.ts` is pre-configured with App Name **AI Smart Assistant** and Package ID **`com.aismartassistant.app`**. Note: Capacitor packages the static frontend (`dist/`), so point API calls to your deployed backend HTTPS URL when running on a physical device.

1. Install Android platform package locally:
   ```bash
   npm install @capacitor/android
   npm run build
   npx cap add android
   npx cap sync android
   ```
2. Open the native project in Android Studio:
   ```bash
   npx cap open android
   ```
3. In Android Studio, wait for Gradle sync to finish, then select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the installable APK.
