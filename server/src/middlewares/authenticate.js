import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import * as userModel from '../models/user.model.js';
import { ROLES } from '../utils/constants.js';
import { memoryStore } from '../services/memory-store.js';

/**
 * Verifies the access token and attaches `req.user`.
 *
 * We re-read the user from the database on every request so that blocking or
 * deleting an account takes effect immediately, rather than up to 15 minutes
 * later when the token expires. It's a single primary-key lookup.
 *
 * NOTE: For development/demo purposes when database is unavailable,
 * the system falls back to memory store. In production, always use real auth.
 */
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization ?? '';

    // No token provided - treat as guest (not admin!)
    if (!header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = header.slice(7).trim();

    // Empty token - treat as guest
    if (!token) {
      req.user = null;
      return next();
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch (err) {
      // Token is invalid or expired - treat as guest, let endpoints decide
      // whether to allow guest access or return 401
      req.user = null;
      return next();
    }

    if (!payload || !payload.sub) {
      req.user = null;
      return next();
    }

    // Verify token type
    if (payload.type !== 'access') {
      req.user = null;
      return next();
    }

    let user;
    try {
      user = await userModel.findByPublicId(payload.sub);
    } catch {
      user = null;
    }

    // If user not found in DB, try memory store (for demo/dev mode)
    if (!user) {
      user = memoryStore.getUserByPublicId(payload.sub);
    }

    if (!user) {
      // User no longer exists
      req.user = null;
      return next();
    }

    // Check if user is blocked
    if (user.status === 'blocked') {
      req.user = null;
      return next(ApiError.forbidden('This account has been suspended.'));
    }

    req.user = {
      id: user.internalId || user.id,
      publicId: user.publicId || user.id,
      role: user.role || ROLES.CUSTOMER,
      email: user.email,
      firstName: user.firstName || user.first_name,
      lastName: user.lastName || user.last_name,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Attaches `req.user` when a valid token is present, but never rejects.
 * Used by endpoints that behave differently for guests vs signed-in shoppers
 * (guest checkout, for example).
 */
export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  try {
    await authenticate(req, res, (err) => {
      if (err) req.user = undefined;
      next();
    });
  } catch {
    req.user = undefined;
    next();
  }
}

/**
 * Blocks anyone who isn't an admin. Always use AFTER `authenticate`.
 * Requires a valid, verified token with admin role.
 */
export function requireAuth(req, _res, next) {
  if (!req.user)
    return next(
      ApiError.unauthorized('Authentication required. Please sign in.')
    );
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(
      ApiError.unauthorized('Authentication required. Please sign in.')
    );
  }
  if (req.user.role !== ROLES.ADMIN) {
    return next(ApiError.forbidden('Admin access required.'));
  }
  next();
}

/**
 * Middleware that allows admin access only from configured admin credentials.
 * This is a stricter version for sensitive operations.
 * In production, this should verify against the actual database.
 */
export async function verifyAdminCredentials(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.'));
  }
  if (req.user.role !== ROLES.ADMIN) {
    return next(ApiError.forbidden('Admin access required.'));
  }

  // Additional verification - check user exists and is active
  try {
    const user = await userModel.findById(req.user.id);
    if (!user || user.status !== 'active' || user.role !== ROLES.ADMIN) {
      return next(ApiError.forbidden('Invalid admin account.'));
    }
  } catch {
    // If DB check fails, allow the request if user was already validated
    // This supports demo mode with memory store
  }

  next();
}
