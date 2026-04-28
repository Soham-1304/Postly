import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
}

/**
 * Sign an access token (15 minutes expiry)
 */
export function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { id: userId, email },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Sign a refresh token (7 days expiry)
 */
export function signRefreshToken(userId: string, email: string): string {
  return jwt.sign(
    { id: userId, email },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify an access token and return payload
 * Throws if token is invalid or expired
 */
export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as TokenPayload;
  return payload;
}

/**
 * Verify a refresh token and return payload
 * Throws if token is invalid or expired
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as TokenPayload;
  return payload;
}
