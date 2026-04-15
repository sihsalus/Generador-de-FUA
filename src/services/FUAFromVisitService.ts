import {z} from "zod";

import { isValidUUIDv4 } from "../utils/utils";
import FUAFromVisitImplementation from "../implementation/sequelize/FUAFromVisitImplementation";
import FUAFormatFromSchemaService from "./FUAFormatFromSchemaService";
import BaseEntityVersionService from "./BaseEntityVersionService";
import BaseEntity from "../modelsTypeScript/BaseEntity";
import { Version_Actions } from "../utils/VersionConstants";
const {PDFDocument} = require ('pdf-lib');
import { computeHmacHex } from "../utils/utils";
import { getBrowser } from "../utils/utils";
import FUAFromVisitPDFService from "./FUAFromVisitPDFService";
import * as path from 'path';

import FUAFormat, { FUAFormatInterface } from "../modelsTypeScript/FUAFormat";
import {FUAReference} from "../utils/queueImplementation";

//Instance import 
import fuaQueue from "../utils/queueImplementation";
import { importPayloadToMapping } from "../utils/mappingUtils";

// Schemas
const newFUAFromVisitSchema = z.object({
    // FUA Data, checksum not needed
    payload: z.record(z.any()), 
    schemaType: z.string(),    
    // Audit Data
    outputType: z.string(),
    FUAFormatFromSchemaId: z.string(),
    createdBy: z.string()
});


class FUAFromVisitService {

    // Creation of FUA Field
    async create(data: {
        // FUAFromVisit Data
        payload: any; 
        schemaType: string;
        outputType: string;
        // FUAFormatFromSchema Identifier
        FUAFormatFromSchemaId: string;
        // Audit Data
        createdBy: string;
    }) {
        
        // Object validation
        const result = newFUAFromVisitSchema.safeParse(data);
        if( !result.success){
            console.error('Error in FUA From Visit Service - create: ZOD validation. \n', result.error);
            const newError = new Error('Error in FUA From Visit Service - create: ZOD validation. ');
            (newError as any).details = result.error;
            throw newError;
        }

        // Check if FUAFormatFromSchema exists
        let auxFUAFormat = null;
        try {
            auxFUAFormat = await FUAFormatFromSchemaService.getByIdOrUUID(data.FUAFormatFromSchemaId);
        }catch(err: any){
            console.error(`Error in FUA From Visit service - create - consultinf Format:  `, err);
            throw new Error(`Error in FUA From Visit service - create- consultinf Format:  ` + (err as Error).message);
        }

        if(auxFUAFormat == null){
            // FUAFromat sent doesnt exist
            const newError = new Error(`Error in FUA From Visit Service - create: FUAFormat identified with ${data.FUAFormatFromSchemaId} doesnt exist. `);
            throw newError;
        }

        // Send data to create  
        let returnedFUA = null;

        // TODO: update with a new fucntion in case of the putputType sent
        // Auxiliar file
        // Example: save a blob
        const buffer = Buffer.from('Hello, I am stored as a blob!');

        try {
            //Payload validation
            //const aux = JSON.parse(data.payload);

            returnedFUA = await FUAFromVisitImplementation.createSequelize({
                payload: JSON.stringify(data.payload),
                schemaType: data.schemaType,
                outputType: data.outputType,
                output: buffer,
                FUAFormatFromSchemaId: auxFUAFormat.id,
                // Audit Data
                createdBy: data.createdBy,
            });
        } catch (err: unknown){
            console.error(`Error in FUA From Visit service - create:  `, err);
            throw new Error(`Error in FUA From Visit service - create:  ` + (err as Error).message);
        }

        // Insert version
        let newVersion = null;
        try{
                newVersion = await BaseEntityVersionService.create(
                new BaseEntity(returnedFUA.dataValues),
                "FUAFromVisit",
                Version_Actions.CREATE,
                [ {
                    type: "FUAFormatFromSchema",
                    uuid: auxFUAFormat.uuid
                } ]
            );
        }catch(error: any){
            (error as Error).message =  'Error in FUA From Visit Service:  ' + (error as Error).message;
            throw error;
        }

        // Insert FUAFromVisitPDF
        
        // Get the html preview of the FUAFRomVisit:
        // - FUAFormatFromSchema (Foreign Key)
        // Call FUAFromSchemaService and get the html preview
        // - Mapping // TODO
        // - Payload // TODO

        // Get the htmlPreview as a string using (FUAFormatFomSchema + Mapping + Payload)
        // Use the htmlPreview to generate the PDF bytes this.generatePDF(htmlPreview)
        
        //let auxFormat = await FUAFormatFromSchemaService.getByIdOrUUID(data.FUAFormatFromSchemaId);

        try{
            const aux = new FUAFormat(auxFUAFormat as FUAFormatInterface);
            const htmlPreview : string = await aux.renderHtmlContent(false);
            const auxPDF_Uint8Array = await this.generatePdf(htmlPreview); // Need the pdf byte stream
            const auxPDF_Uint8ArraySigned = await this.pdfMetadataHashSignature(auxPDF_Uint8Array, "evan");
            const auxPDFBuffer = Buffer.from(auxPDF_Uint8ArraySigned);

            console.log(returnedFUA.dataValues.id);
            let auxFUAFromVisitPDF = await FUAFromVisitPDFService.create({
                // TODO set name mechanism
                name: ( auxFUAFormat.uuid.toString()+'_PDF' ),
                fileData: (auxPDFBuffer as Buffer),
                versionTag: "1.0",
                versionCounter: 1,
                FUAFromVisitModelId: returnedFUA.dataValues.id,
                BaseEntityVersionModelId: newVersion.uuid,
                createdBy: data.createdBy
            });            
        } catch (err: unknown){
            console.error(`Error in FUA From Visit service - create:  `, err);
            throw new Error(`Error in FUA From Visit service - create:  ` + (err as Error).message);
        }

        return {
            uuid: returnedFUA.uuid
        };
    };
    
    async getRender(id: string){
        let html : string = '';
        try {
            let renderContent = null;
            const FUAFromVisit = await this.getByIdOrUUID(id);
            
            let auxFUAFormat = await FUAFormatFromSchemaService.getByIdOrUUID(FUAFromVisit.FUAFormatFromSchemaId);
            let auxFormat = await new FUAFormat(auxFUAFormat);

            // TODO: replace generic mapping
            const mappingPath = path.resolve(process.cwd(), "./src/utils/FUA_Mapping_Examples/FUA_Mapping_1.0.js");
            const module = await import(mappingPath);
            const mappingObject = module.default;

            const visitContent = FUAFromVisit.payload;
            const auxObject = {
                payload: JSON.parse(visitContent)
            };

            const procMapping = importPayloadToMapping(JSON.stringify(auxObject),mappingObject);
            
            html  = await auxFormat.renderHtmlContent(false, mappingObject);
        
            return html
        }catch(error: unknown){
            console.error('Error in Utils - createDemoFormat: ', error);
            (error as Error).message =  'Error in Utils - createDemoFormat: ' + (error as Error).message;
            throw error;
        } 
        
    };

    async hashSignatureVerification(pdfBytes : any, secretKey : any) : Promise<Boolean>{
        
        try{
            const pdfDoc = await PDFDocument.load(pdfBytes, { 
                updateMetadata: false
            });
            const signature = pdfDoc.getSubject();
            
            const signaturePrefix = "SIH.SALUS - HASH: ";
            pdfDoc.setSubject(`${signaturePrefix}`);
        
            const pdfBytesNoSignature = await pdfDoc.save();
        
            const hmacHex = computeHmacHex(pdfBytesNoSignature, secretKey);
        
            console.log(signature);
            console.log(`${signaturePrefix}${hmacHex}`);
        
            if (signature === `${signaturePrefix}${hmacHex}`){
                console.log("Same signature.");
                return true;
            }else{
                console.log("Not the same signature."); 
                return false;
            }
        } catch(err: unknown){
            console.error('Error in FUA From Visit Service - hashSignatureVerification : ', err);
            (err as Error).message =  'Error in FUA From Visit Service - hashSignatureVerification : ' + (err as Error).message;
            throw err; 
        }
    };

    async generatePdf(answer : string){
        try {
            const browser = await getBrowser();
            const page = await browser.newPage();
        
            await page.emulateMediaType("print");
        
            await page.setContent(answer, {
                waitUntil: "networkidle0",
            });

            const useCssPageSize = true;
            const pdfBytes = await page.pdf(
                useCssPageSize
                ? {
                    printBackground: true,
                    preferCSSPageSize: true,           // <-- respecte @page { size: ... }
                    //margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
                    pageRanges: "1-",
                    //scale: 1,
                    }
                : {
                    printBackground: true,
                    preferCSSPageSize: false,
                    //width: "210mm",                    // <-- taille forcée côté Puppeteer
                    //height: "297mm",
                    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
                    pageRanges: "1-",
                    displayHeaderFooter: false,
                    scale: 1,
                    }
            );
        
            await page.close(); 

            return pdfBytes;
        
        } catch (err: unknown){
            console.error('Error in FUA From Visit Service - generatePDF: ', err);
            (err as Error).message =  'Error in FUA From Visit Service - generatePDF: ' + (err as Error).message;
            throw err;
        }
    };

    async generatePDFFromId(id : string){
        let htmlContent = '';
        try {
            // Get html content
            htmlContent = await this.getRender(id);

            let pdfBytes = await this.generatePdf(htmlContent);

            return pdfBytes;
        
        } catch (err: unknown){
            console.error('Error in FUA From Visit Service - generatePDF: ', err);
            (err as Error).message =  'Error in FUA From Visit Service - generatePDF: ' + (err as Error).message;
            throw err;
        }
    };

    async pdfMetadataHashSignature(pdfBytes : any, secretKey : any) : Promise<Uint8Array> {
        // we open the doc to standardise 'empty' the metadata Keywords field
        try {
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

        } catch (err: unknown){
            console.error('Error in FUA From Visit Service - pdfMetadataHashSignature: ', err);
            (err as Error).message =  'Error in FUA From Visit Service - pdfMetadataHashSignature: ' + (err as Error).message;
            throw err;
        }        
    }

    // List all FUA Pagesç
    // TODO Pagination
    async listAll(){
        let returnedFUAFields = [];
        try {
            returnedFUAFields = await FUAFromVisitImplementation.listAllSequelize();

        } catch (err: unknown){
            console.error('Error in FUA From Visit Service: ', err);
            (err as Error).message =  'Error in FUA From Visit Service: ' + (err as Error).message;
            throw err;
        }        

        return returnedFUAFields;
    };

    // get FUA From Visit by Id (Id or UUID)
    async getByIdOrUUID (idReceived: string){
        let returnedFUAFromVisit = null;

        // Check if UUID or Id was sent
        let id = null;
        const nuNumber = Number(idReceived);
        if( Number.isInteger(nuNumber) ){
            id = nuNumber;

            try {
                returnedFUAFromVisit = await FUAFromVisitImplementation.getByIdSequelize(id);

            } catch (err: unknown){
                console.error('Error in FUA From Visit Service - getByIdOrUUID: ', err);
                (err as Error).message =  'Error in FUA From Visit Service - getByIdOrUUID: ' + (err as Error).message;
                throw err;
            }     
        }else{
            // Get id by UUID

            //Validate UUID Format        
            if (!isValidUUIDv4(idReceived) ) {
                console.error('Error in FUA From Visit: Invalid UUID format. ');
                throw new Error("Error in FUA From Visit: Invalid UUID format. ");
            }
            try {
                returnedFUAFromVisit = await FUAFromVisitImplementation.getByUUIDSequelize(idReceived);
            } catch (err: unknown){
                console.error('Error in FUA From Visit Service: ', err);
                (err as Error).message =  'Error in FUA From Visit Service: ' + (err as Error).message;
                throw err;
            }            
        }      
            
        // If nothing was found, it will return a null
        return returnedFUAFromVisit;
    };

    async addFUAinQueue(UUID : any, visitUUID : any) : Promise<void> {
        try{
            const fuaReference = new FUAReference(UUID, visitUUID);
            fuaQueue.enqueue(fuaReference);
        } catch(err: any){
            console.error('Error in FUA From Visit Service - addFUAinQueue: ', err);
            (err as Error).message =  'Error in FUA From Visit Service - addFUAinQueue: ' + (err as Error).message;
            throw err;
        };
    }

    async removeFUAfromQueue(UUID : any) : Promise<FUAReference> {
        try{
            return fuaQueue.dequeue(UUID);
        } catch(err: any){
            console.error('Error in FUA From Visit Service - removeFUAfromQueue: ', err);
            (err as Error).message =  'Error in FUA From Visit Service - removeFUAfromQueue: ' + (err as Error).message;
            throw err;
        };
    }

};

export default new FUAFromVisitService();
