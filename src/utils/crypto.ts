import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns format: iv:authTag:ciphertext (all hex)
 */
export function encrypt(plaintext: string): string {
  // Parse 64-char hex key to 32 bytes
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

  // Generate random IV (16 bytes)
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * Input format: iv:authTag:ciphertext (all hex)
 */
export function decrypt(ciphertext: string): string {
  // Parse 64-char hex key to 32 bytes
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

  // Split by colon
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format');
  }

  // Convert from hex
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt
  let plaintext = decipher.update(encrypted).toString('utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
