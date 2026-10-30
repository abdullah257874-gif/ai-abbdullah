import type { NextFunction, Request, Response } from 'express';
import { store, type PublicUser } from './store.ts';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser | null;
  rawToken?: string | null;
}

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

// Clean up idle rate limit buckets periodically
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, bucket] of buckets.entries()) {
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: {
  keyPrefix: string;
  windowMs: number;
  maxAuthenticated: number;
  maxGuest: number;
}) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : req.socket.remoteAddress) || 'unknown';

    const actorKey = req.user ? `usr:${req.user.userId}` : `ip:${ip}`;
    const bucketKey = `${options.keyPrefix}:${actorKey}`;
    const limit = req.user ? options.maxAuthenticated : options.maxGuest;
    const now = Date.now();

    const bucket = buckets.get(bucketKey) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

    if (bucket.timestamps.length >= limit) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((options.windowMs - (now - bucket.timestamps[0])) / 1000)
      );
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: req.user
            ? `Rate limit reached (${limit} requests per window). Please wait ${retryAfterSec}s before trying again.`
            : `Guest rate limit reached (${limit} trial requests per window). Sign in or wait ${retryAfterSec}s to continue.`,
        },
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(bucketKey, bucket);
    next();
  };
}

export function securityHeadersAndCors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');

  const allowedOrigin = process.env.APP_URL || req.headers.origin || '*';
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? req.headers.origin : allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 && token.length <= 1024 ? token : null;
}

export function attachOptionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  req.rawToken = token;
  req.user = token ? store.verifySessionToken(token) : null;
  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  const user = token ? store.verifySessionToken(token) : null;
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access your private account records.',
      },
    });
    return;
  }
  req.rawToken = token;
  req.user = user;
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);
  const user = token ? store.verifySessionToken(token) : null;
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Administrator sign-in is required.',
      },
    });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN_ADMIN_ONLY',
        message: 'Access denied. Only authorized system administrators may view this dashboard.',
      },
    });
    return;
  }
  req.rawToken = token;
  req.user = user;
  next();
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export function validateImageUpload(
  mimeType: unknown,
  base64Data: unknown
): { valid: true; mimeType: string; cleanBase64: string } | { valid: false; reason: string } {
  if (typeof mimeType !== 'string' || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      reason: 'Unsupported image format. Allowed formats: JPEG, PNG, WEBP, or GIF.',
    };
  }
  if (typeof base64Data !== 'string' || base64Data.trim().length === 0) {
    return {
      valid: false,
      reason: 'Image payload is empty or invalid.',
    };
  }
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] || '' : base64Data.trim();
  const estimatedBytes = Math.ceil((cleanBase64.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      reason: 'Image exceeds the 4 MB maximum upload size limit.',
    };
  }
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(cleanBase64)) {
    return {
      valid: false,
      reason: 'Malformed base64 image encoding.',
    };
  }
  return { valid: true, mimeType: mimeType.toLowerCase(), cleanBase64 };
}

export function isValidEmail(email: unknown): email is string {
  return (
    typeof email === 'string' &&
    email.length >= 5 &&
    email.length <= 160 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}
