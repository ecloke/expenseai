import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-this', 'salt', 32);

/**
 * Encrypt sensitive data like API keys and tokens
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted text with IV
 */
export function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Combine IV and encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text with IV
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Generate a random encryption key for environment setup
 * @returns {string} - 32 character random string
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(16).toString('hex');
}