import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits for GCM

// Get or generate a stable secret key
const getSecretKey = () => {
  const secret = process.env.SESSION_SECRET || "notion_ai_default_fallback_session_secret_32_chars";
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Encrypts a text payload using AES-256-GCM.
 */
export function encrypt(text: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Package IV, encrypted text, and Auth Tag together
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

/**
 * Decrypts a ciphertext payload using AES-256-GCM.
 */
export function decrypt(ciphertext: string): string {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid cipher text format");
    }
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted as any, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    console.error("Session decryption failed:", err);
    throw new Error("Session decryption failed");
  }
}
