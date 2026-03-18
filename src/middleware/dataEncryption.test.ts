import { describe, expect, test, beforeAll } from '@jest/globals';
import { encryptBuffer, decryptBuffer } from './dataEncryption';

const testPrefix = 'Middleware - dataEncryption';

describe('Middleware - dataEncryption', () => {
  const key = '123456789012';
  const message = 'iam a message to encrypt 123';

  let encryptedMessage : Buffer = Buffer.from(message, 'utf8');

  test('Encrypts to a non-empty buffer and changes plaintext', () => {
    encryptedMessage = encryptBuffer(key, Buffer.from(message, 'utf8'));
    
    /*
    console.log('\n'+'Message before encryption: '+Buffer.from(message).toString('hex'));
    console.log('\n'+'Message after encryption:  '+encryptedMessage.toString('hex'));
    */

    expect(Buffer.isBuffer(encryptedMessage)).toBe(true);
    expect(encryptedMessage.equals(Buffer.from(message))).toBe(false);
  });

  test('Decrypts to a non-empty buffer', () => {
    const uncryptedMessage = decryptBuffer(key, encryptedMessage);

    expect(uncryptedMessage).not.toBeNull();
    if (!uncryptedMessage) throw new Error('Decryption returned null');
    
    /*
    console.log('\n'+'Message before decryption:  '+encryptedMessage.toString('hex'));
    console.log('\n'+'Message after decryption:   '+uncryptedMessage.toString('hex'));
    */

    expect(Buffer.from(message).equals(uncryptedMessage)).toBe(true);
  });
});
