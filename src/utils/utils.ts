const crypto = require('crypto');
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'jsonc-parser';
import FUAFormat from "../modelsTypeScript/FUAFormat";
import puppeteer from "puppeteer";
const archiver = require('archiver');
import { PassThrough } from 'stream';
import { importPayloadToMapping } from "./mappingUtils";



/**
 * Validates whether a given string is a valid UUID v4.
 * 
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
 */
export function isValidUUIDv4(uuid: string): boolean {
  const uuidV4Regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidV4Regex.test(uuid);
}





export async function createDemoFormat(printMode : boolean){
  try{
    const jsoncPath = path.resolve(process.cwd(), "./src/utils/FUA_Schema_Examples/FUA_1.0.jsonc");
    const jsoncContent = fs.readFileSync(jsoncPath, 'utf-8');
    const parsed = parse(jsoncContent);
    let auxFormat = await new FUAFormat(parsed);

    /*
    const mappingPath = path.resolve(process.cwd(), "./src/utils/FUA_Mapping_Examples/FUA_Mapping_1.0.js");
    const module = await import(mappingPath);
    const mappingObject = module.default;
    */ 

    const mappingPath = path.resolve(process.cwd(), "./src/utils/FUA_Mapping_Examples/FUA_Mapping_1.0.js");
    delete require.cache[mappingPath];  // Clears cache for reloading
    const mappingObject = require(mappingPath);
    
    /*
    const mappingContent = fs.readFileSync(mappingPath, 'utf-8');
    const mappingObject = eval(`(${mappingContent})`);
    */
    
    const visitPath = path.resolve(process.cwd(), "./src/utils/VisitExamples/Visit2.json");
    const visitContent = fs.readFileSync(visitPath, 'utf-8');

    const procMapping = importPayloadToMapping(visitContent,mappingObject);


    let html : string = '';

    //html
  
    //html = await FUARenderingUtils.renderFUAFormatFromSchema(parsed, printMode);
    html  = await auxFormat.renderHtmlContent(false, mappingObject);
    return html
  }catch(error: unknown){
    console.error('Error in Utils - createDemoFormat: ', error);
    (error as Error).message =  'Error in Utils - createDemoFormat: ' + (error as Error).message;
    throw error;
  } 
  ;
};


// Dedent tabulations for strings declared with ´´
export function dedentCustom(str: string): string {
  if(str === null || str == undefined){
    throw new Error("Error in Utils - dedentCustom: string received should not be null. ");
  }
  const lines = str.split('\n');

  // Find the first non-empty line with tabs (after any initial empty lines)
  const firstIndentedLine = lines.find(line => line.trim().length > 0);
  if (!firstIndentedLine) return str.trim(); // no valid content

  // Count leading tabs in the first non-empty line
  const tabMatch = firstIndentedLine.match(/^(\t+)/);
  const tabCount = tabMatch ? tabMatch[1].length : 0;

  // Remove exactly that many leading tabs from all lines
  const dedented = lines.map(line => {
      let i = 0;
      while (i < tabCount && line.startsWith('\t')) {
        line = line.slice(1);
        i++;
      }
      return line;
  });

  return dedented.join('\n').trim();

}

// Remove the background-color attribut when printing rendering
export function removeBackgroundColor(inlineStyle?: string): string {
  if (inlineStyle == undefined || inlineStyle == null){
    return ''
  }
  return inlineStyle
    .split(";")
    .map(rule => rule.trim())
    .filter(rule => rule.length > 0 && !/^background-color\s*:/i.test(rule))
    .join("; ");
}


export function generateSHA256Hash(input: string): string {
  return crypto.createHash('sha256').update(input, "utf8").digest('hex');
}

export function verifyHash(content: string, expectedHash: string): boolean {
  const hash = crypto.createHash("sha256").update(content, "utf8").digest('hex');
  return hash === expectedHash;
}

export function isStrictIntegerString(value: string): boolean {
    // Checks for optional leading minus, then digits, and nothing else
    return /^-?\d+$/.test(value);
}

export function computeHmacHex(bytes: Uint8Array | Buffer, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(Buffer.from(bytes)).digest('hex');
}

export async function getBrowser() {
  let browserPromise = null;
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true, 
      defaultViewport: null,
      args: ["--no-sandbox", "--font-render-hinting=none"],
    });
  }
  return browserPromise;
}

// ZIP Creation from txt attentionfiles
export function generateTxtFiles(): Buffer[] {
    const numFiles = 10;
    const fileSizeMB = 0.1;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;
    const files: Buffer[] = [];


    const chunk = Buffer.from('A'.repeat(1024)); 
    const chunksNeeded = fileSizeBytes / chunk.length;

    for (let i = 0; i < numFiles; i++) {
        const fileBuffer = Buffer.alloc(0);
        let combined = Buffer.alloc(0);

        for (let j = 0; j < chunksNeeded; j++) {
            combined = Buffer.concat([combined, chunk]);
        }

        files.push(combined);
    }
    return files;
}

export type TxtEntry = {
  name: string;
  content: Buffer;
};

function encryptBuffer(buffer: Buffer, password: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); 

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

export async function zipAndEncryptTxtFiles(
  files: TxtEntry[],
  password: string
): Promise<Buffer> {
  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('close', () => resolve(Buffer.concat(chunks)));
    stream.on('end', () => {});

    archive.on('warning', (err: any) => {
      if (err.code !== 'ENOENT') reject(err);
    });
    archive.on('error', (err: any) => reject(err));

    archive.pipe(stream);

    for (const f of files) {
      archive.append(f.content, { name: f.name });
    }

    archive.finalize().catch(reject);
  });

  const encrypted = encryptBuffer(zipBuffer, password);

  return encrypted;
}

export function decryptBuffer(encrypted: Buffer, password: string): Buffer {
  const saltLen = 16;
  const ivLen = 12;
  const authTagLen = 16;

  if (encrypted.length < saltLen + ivLen + authTagLen + 1) {
    throw new Error('Invalid encrypted data');
  }

  const salt = encrypted.subarray(0, saltLen);
  const iv = encrypted.subarray(saltLen, saltLen + ivLen);
  const authTag = encrypted.subarray(saltLen + ivLen, saltLen + ivLen + authTagLen);
  const ciphertext = encrypted.subarray(saltLen + ivLen + authTagLen);

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag); 

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plain;
}







// export async function createZipFromAttentions(): Promise<void>{

// }

//Tests of hash functions

/* const record = { patientId: "123", name: "Alice" };

const hash = generateSHA256Hash(JSON.stringify(record));

console.log("Hash:", hash);
console.log("Verify:", verifyHash(JSON.stringify(record), hash)); // true
console.log("Verify with wrong content:", verifyHash(JSON.stringify({ patientId: "456" }), hash)); // false
 */




export type FactoryTypesTarget = 'integer' | 'boolean' | 'string';

export function parseAs(value: string, target: FactoryTypesTarget): number | boolean | string {
  if (value === null || value === undefined) {
    return value;
  }

  const trimmed = value.trim();

  switch (target) {
    case 'integer': {
      if (!isStrictIntegerString(trimmed)) {
        throw new Error(`parseAs: entier invalide: "${value}"`);
      }
      const n = Number(trimmed);
      if (!Number.isSafeInteger(n)) {
        throw new Error(`parseAs: entier hors de la plage sûre: "${value}"`);
      }
      return n;
    }
    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      throw new Error(`parseAs: booléen invalide: "${value}". Attendu "true" ou "false".`);
    }
    case 'string':
      return trimmed;
    default: {
      const unreachable: never = target as never;
      throw new Error(`parseAs: type non supporté: ${unreachable}`);
    }
  }

}