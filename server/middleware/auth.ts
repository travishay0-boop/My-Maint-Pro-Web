import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// How many times to retry a failed user lookup before giving up.
// A single retry handles the common case: pool had one stale connection,
// the pool discards it and opens a fresh one, the second attempt succeeds.
const AUTH_DB_RETRIES = 1;
const AUTH_DB_RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Step 1 — header presence check (no DB required)
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string') {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const parsedId = parseInt(userId, 10);
  if (isNaN(parsedId)) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // Step 2 — DB lookup with retry for transient connection errors.
  //
  // IMPORTANT: We deliberately separate DB errors from auth failures.
  //
  // The bug: When the iPad goes to sleep, Neon WebSocket connections in the pool
  // become silently stale. On wake, the first DB call throws a connection error.
  // Previously the catch block returned 500 "Authentication failed", which the
  // mobile app treated as a logout trigger, showing "Something went wrong".
  //
  // Fix: DB errors return 503 (Service Unavailable) with code: 'DB_UNAVAILABLE'.
  // The mobile app must treat 503 as a transient error (retry / show a spinner),
  // NOT as a logout event. Only 401 should clear stored credentials.
  let user: User | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt <= AUTH_DB_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(AUTH_DB_RETRY_DELAY_MS);
      }
      user = await storage.getUser(parsedId) ?? undefined;
      lastError = undefined;
      break; // success
    } catch (err) {
      lastError = err;
      console.error(`Auth: DB lookup failed (attempt ${attempt + 1}/${AUTH_DB_RETRIES + 1}):`, err);
    }
  }

  // DB is unreachable after all retries — return 503, NOT 401.
  // The mobile app must NOT log the user out on 503.
  if (lastError !== undefined) {
    return res.status(503).json({
      message: 'Service temporarily unavailable. Please try again in a moment.',
      code: 'DB_UNAVAILABLE',
    });
  }

  // User not found or deactivated — this is a genuine auth failure → 401.
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid user' });
  }

  req.user = user;
  next();
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}

export function requireAgencyAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const agencyId = parseInt(req.params.agencyId || req.query.agencyId as string);

  if (!agencyId) {
    return res.status(400).json({ message: 'Agency ID required' });
  }

  if (req.user.agencyId !== agencyId && req.user.role !== 'property_owner') {
    return res.status(403).json({ message: 'Access denied to this agency' });
  }

  next();
}
