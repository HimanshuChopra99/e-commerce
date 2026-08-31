import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/api-error.js';
import {
  publicId,
  sha256,
  randomToken,
  normalizeEmail,
} from '../utils/helpers.js';
import { isDatabaseConnected } from '../config/database.js';
import * as userModel from '../models/user.model.js';
import * as tokenModel from '../models/auth-token.model.js';
import { memoryStore } from './memory-store.js';

/**
 * Comparing against a real-looking hash when the user doesn't exist keeps the
 * response time constant, so an attacker can't discover which emails are
 * registered by timing the endpoint.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-attack-placeholder', 10);

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.publicId, role: user.role, type: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.publicId, type: 'refresh', jti: publicId() },
    env.jwt.refreshSecret,
    { expiresIn: `${env.jwt.refreshTtlDays}d` }
  );
}

async function issueTokens(user, context = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const { exp } = jwt.decode(refreshToken);
  await tokenModel.create({
    userId: user.internalId,
    type: 'refresh',
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(exp * 1000),
    userAgent: context.userAgent,
    ipAddress: context.ip,
  });

  return { accessToken, refreshToken };
}

/**
 * Creates tokens for memory store users (demo/dev mode)
 */
function issueTokensMemory(user, _context = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store in memory for demo mode
  return { accessToken, refreshToken };
}

export async function register(input, context = {}) {
  const email = normalizeEmail(input.email);

  // Check in database
  if (await userModel.emailExists(email)) {
    throw ApiError.conflict('An account with that email already exists.');
  }

  // Also check memory store
  const memoryUser = memoryStore.getUserByEmail(email);
  if (memoryUser) {
    throw ApiError.conflict('An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);

  try {
    const user = await userModel.create({
      publicId: publicId(),
      role: 'customer',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      passwordHash,
      phone: input.phone ?? null,
      marketingOptIn: Boolean(input.marketingOptIn),
    });

    const tokens = await issueTokens(user, context);
    logger.info({ userId: user.publicId }, 'user registered');

    return {
      user: userModel.toPublicUser(user),
      ...tokens,
    };
  } catch (err) {
    // If DB fails, create in memory store
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || !err.code) {
      const newUser = memoryStore.addUser({
        role: 'customer',
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        passwordHash,
        phone: input.phone ?? null,
        marketingOptIn: Boolean(input.marketingOptIn),
      });

      const tokens = issueTokensMemory(newUser, context);
      logger.info(
        { userId: newUser.publicId },
        'user registered (memory store)'
      );

      const { passwordHash: _, ...publicUser } = newUser;
      return {
        user: publicUser,
        ...tokens,
      };
    }
    throw err;
  }
}

export async function login({ email, password }, context = {}) {
  const normalizedEmail = normalizeEmail(email);

  // Try database first
  let user = await userModel.findByEmailWithHash(normalizedEmail);

  // Fallback to memory store
  if (!user) {
    const memoryUser = memoryStore.getUserByEmail(normalizedEmail);
    if (memoryUser) {
      const matches = await bcrypt.compare(password, memoryUser.passwordHash);
      if (matches) {
        const tokens = issueTokensMemory(memoryUser, context);
        logger.info(
          { userId: memoryUser.publicId, role: memoryUser.role },
          'user signed in (memory store)'
        );
        const { passwordHash: _, ...publicUser } = memoryUser;
        return { user: publicUser, ...tokens };
      }
    }
  }

  // Always run bcrypt so the timing is identical for unknown emails.
  const matches = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH
  );

  // One message for both cases — never reveal which emails exist.
  if (!user || !matches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }
  if (user.status === 'blocked') {
    throw ApiError.forbidden('This account has been suspended.');
  }

  await userModel.touchLastLogin(user.internalId).catch(() => {});
  const tokens = await issueTokens(user, context);

  logger.info({ userId: user.publicId, role: user.role }, 'user signed in');
  return { user: userModel.toPublicUser(user), ...tokens };
}

/**
 * Rotating refresh: the old token is consumed and a new one issued.
 *
 * If a token verifies but isn't in the table it was already rotated — that
 * means someone is replaying a stolen token, so we revoke every session for
 * that user.
 */
export async function refresh(rawToken, context = {}) {
  if (!rawToken) throw ApiError.unauthorized('No refresh token supplied.');

  let payload;
  try {
    payload = jwt.verify(rawToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized(
      'Your session has expired. Please sign in again.'
    );
  }
  if (payload.type !== 'refresh')
    throw ApiError.unauthorized('Wrong token type.');

  if (isDatabaseConnected()) {
    try {
      const stored = await tokenModel.findActive(sha256(rawToken), 'refresh');

      if (!stored) {
        const user = await userModel.findByPublicId(payload.sub);
        if (user) {
          await tokenModel.revokeAllForUser(user.internalId, 'refresh');
          logger.warn(
            { userId: user.publicId },
            'refresh token reuse — all sessions revoked'
          );
        }
        throw ApiError.unauthorized(
          'Session is no longer valid. Please sign in again.'
        );
      }

      const user = await userModel.findByPublicId(payload.sub);
      if (!user) throw ApiError.unauthorized('Account no longer exists.');
      if (user.status === 'blocked')
        throw ApiError.forbidden('This account has been suspended.');

      await tokenModel.consume(stored.id);
      const tokens = await issueTokens(user, context);
      return { user: userModel.toPublicUser(user), ...tokens };
    } catch (err) {
      if (err.statusCode) throw err;
    }
  }

  // Below here: Memory store / fallback mode
  const memoryUser = await userModel.findByPublicId(payload.sub);
  if (!memoryUser) {
    throw ApiError.unauthorized(
      'Session is no longer valid. Please sign in again.'
    );
  }
  if (memoryUser.status === 'blocked')
    throw ApiError.forbidden('This account has been suspended.');
  const tokens = issueTokensMemory(memoryUser, context);
  return { user: userModel.toPublicUser(memoryUser), ...tokens };
}

export async function logout(rawToken) {
  if (!rawToken) return;
  try {
    const stored = await tokenModel.findActive(sha256(rawToken), 'refresh');
    if (stored) await tokenModel.consume(stored.id);
  } catch {
    // Ignore errors - user is logging out anyway
  }
}

export async function logoutAll(userId) {
  try {
    await tokenModel.revokeAllForUser(userId, 'refresh');
  } catch {
    // Ignore errors
  }
}

export async function getProfile(userId) {
  // Try database first
  try {
    const user = await userModel.findById(userId);
    if (!user) throw ApiError.notFound('Account not found.');

    if (user.role === 'customer') {
      const stats = await userModel.getCustomerStats(userId);
      return { ...userModel.toPublicUser(user), ...stats };
    }
    return userModel.toPublicUser(user);
  } catch {
    // Fallback to memory store
    const memoryUsers = memoryStore.getUsers();
    const user = memoryUsers.find(
      (u) => u.internalId === userId || u.id === userId
    );
    if (!user) throw ApiError.notFound('Account not found.');
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
}

export async function updateProfile(userId, patch) {
  try {
    const user = await userModel.update(userId, patch);
    return userModel.toPublicUser(user);
  } catch {
    // Memory store fallback
    const user = memoryStore
      .getUsers()
      .find((u) => u.internalId === userId || u.id === userId);
    if (!user) throw ApiError.notFound('Account not found.');
    Object.assign(user, patch, { updatedAt: new Date().toISOString() });
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  let user;
  let isMemoryStore = false;

  try {
    user = await userModel.findByIdWithHash(userId);
  } catch {
    // Try memory store
    const memoryUsers = memoryStore.getUsers();
    user = memoryUsers.find((u) => u.internalId === userId || u.id === userId);
    isMemoryStore = true;
  }

  if (!user) throw ApiError.notFound('Account not found.');

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches)
    throw ApiError.badRequest('Your current password is incorrect.');

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('Your new password must be different.');
  }

  const newHash = await bcrypt.hash(newPassword, env.bcryptRounds);

  if (isMemoryStore) {
    user.passwordHash = newHash;
    user.updatedAt = new Date().toISOString();
  } else {
    await userModel.updatePassword(userId, newHash);
  }

  logger.info({ userId: user.publicId || userId }, 'password changed');
}

export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);

  // Check if user exists
  let user;
  try {
    user = await userModel.findByEmail(normalizedEmail);
  } catch {
    // Try memory store
    user = memoryStore.getUserByEmail(normalizedEmail);
  }

  if (!user) return { sent: true };

  const token = randomToken();

  try {
    await tokenModel.create({
      userId: user.internalId,
      type: 'password_reset',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
  } catch {
    // Ignore if token creation fails
  }

  logger.info(
    {
      userId: user.publicId || user.internalId,
      ...(env.isProd ? {} : { resetToken: token }),
    },
    'password reset requested'
  );
  return { sent: true };
}

export async function resetPassword({ token, newPassword }) {
  try {
    const stored = await tokenModel.findActive(sha256(token), 'password_reset');
    if (!stored)
      throw ApiError.badRequest('This reset link is invalid or has expired.');

    const newHash = await bcrypt.hash(newPassword, env.bcryptRounds);
    await userModel.updatePassword(stored.userId, newHash);
    await tokenModel.consume(stored.id);
    await tokenModel.revokeAllForUser(stored.userId, 'refresh');
    logger.info({ userId: stored.userId }, 'password reset completed');
  } catch (err) {
    if (err.statusCode) throw err;
    throw ApiError.badRequest('This reset link is invalid or has expired.');
  }
}

export async function verifyEmail(token) {
  try {
    const stored = await tokenModel.findActive(sha256(token), 'email_verify');
    if (!stored)
      throw ApiError.badRequest(
        'This verification link is invalid or has expired.'
      );

    await userModel.markEmailVerified(stored.userId);
    await tokenModel.consume(stored.id);
  } catch (err) {
    if (err.statusCode) throw err;
    throw ApiError.badRequest(
      'This verification link is invalid or has expired.'
    );
  }
}
