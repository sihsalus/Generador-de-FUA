
// pdfSignedHash.ts
import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';
import crypto from 'crypto';
import { readFileSync } from 'fs'
import path from 'path';
import { unknown } from 'zod';

/**
 * Compute HMAC-SHA256 hex string of given bytes using secret key.
 */
function computeHmacHex(bytes: Uint8Array | Buffer, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(Buffer.from(bytes)).digest('hex');
}

// My own functions according to the pdf-lib documentation: 
export async function pdfMetadataAccess(pdfBytes : any){

    const pdfDoc = await PDFDocument.load(pdfBytes, { 
        updateMetadata: true 
    });

    console.log('Title:', pdfDoc.getTitle());
    console.log('Author:', pdfDoc.getAuthor());
    console.log('Creator:', pdfDoc.getCreator());
    console.log('Keywords:', pdfDoc.getKeywords());
    console.log('Producer:', pdfDoc.getProducer());
    console.log('Creation Date:', pdfDoc.getCreationDate());
    console.log('Modification Date:', pdfDoc.getModificationDate());
}


export async function pdfMetadataHashSignature(pdfBytes : any, secretKey : any) : Promise<Uint8Array> {
    // we open the doc to standardise 'empty' the metadata Keywords field
    let pdfDoc = await PDFDocument.load(pdfBytes, { 
        updateMetadata: false
    });
    const signaturePrefix = "SIH.SALUS - HASH: ";
    pdfDoc.setSubject(`${signaturePrefix}`);
    const pdfBytesNoSignature = await pdfDoc.save();
    
    const hmacHex = computeHmacHex(pdfBytesNoSignature, secretKey);   

    pdfDoc = await PDFDocument.load(pdfBytesNoSignature, { 
        updateMetadata: false
    });

    pdfDoc.setSubject(`${signaturePrefix}${hmacHex}`);
    
    const pdfBytesSigned = await pdfDoc.save();

    return pdfBytesSigned;
}

export async function pdfMetadataHashSignatureVerification(pdfBytes : any, secretKey : any) : Promise<Boolean>{

    const pdfDoc = await PDFDocument.load(pdfBytes, { 
        updateMetadata: false
    });
    const signature = pdfDoc.getSubject();
    
    const signaturePrefix = "SIH.SALUS - HASH: ";
    pdfDoc.setSubject(`${signaturePrefix}`);

    const pdfBytesNoSignature = await pdfDoc.save();

    const hmacHex = computeHmacHex(pdfBytesNoSignature, secretKey); 

    return signature === `${signaturePrefix}${hmacHex}`;
}
