import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

/*
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // must be 32 bytes (hex/base64/raw)
if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY).length !== 12) {
    throw new Error('ENCRYPTION_KEY env must be set and 12 bytes long');
}
*/    

function encryptBuffer(key: string, data: Buffer) : Buffer {
    const keyBuffer = createHash("sha256").update(key).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
    const ciphertext = Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]); // store as: iv(12)|tag(16)|ciphertext
}

function decryptBuffer(key: string, data: Buffer) : Buffer | null{
    if (!data) return null;
    if (data.length < 28) {
        throw new Error('Invalid encrypted payload');
    }
    
    const keyBuffer = createHash("sha256")
        .update(key)
        .digest();

    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);

    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);

    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export {
    encryptBuffer,
    decryptBuffer,
};