import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

const getEncryptionKey = () => {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY is missing in environment variables');
  }
  // If provided as 64-char hex string, convert to 32-byte Buffer; otherwise hash it to 32 bytes
  if (keyHex.length === 64) {
    return Buffer.from(keyHex, 'hex');
  }
  return crypto.createHash('sha256').update(String(keyHex)).digest();
};

export const encrypt = (text) => {
  if (!text) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedString) => {
  if (!encryptedString) return null;
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted string format');
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export const maskSecret = (secretStr) => {
  if (!secretStr) return '';
  if (secretStr.length <= 4) return '••••';
  const last4 = secretStr.slice(-4);
  return `•••• ${last4}`;
};
