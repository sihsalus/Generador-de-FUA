import { Request, Response} from 'express';

import FUAFromVisitService from '../services/FUAFromVisitService';






const FUAFromVisitController = {

    async create (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAFromVisit = null;
        try {
            newFUAFromVisit = await FUAFromVisitService.create({
                // FUAFromVisit Data
                payload: payload.payload,
                schemaType: payload.schemaType,
                outputType: payload.outputType,
                // FUAFormatFromSchema Identifier
                FUAFormatFromSchemaId: payload.FUAFormatFromSchemaId,
                // Audit Data
                createdBy: payload.createdBy
            });
            res.status(201).json(newFUAFromVisit);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA From Visit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }       
    },

    async render (req: Request, res: Response) : Promise<void>{
        const id = req.params.id as string;

        let htmlRender : string = "";

        try {
            htmlRender = await FUAFromVisitService.getRender(id);
            
            // In case nothing was found 
            if(htmlRender === null){
                res.status(404).json({
                    error: `FUA From Visit by Id or UUID '${id}' couldnt be rendered. `,
                });
            }

            res.status(200).send(htmlRender);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to render FUA From Visit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }     
    },

    async hashSignatureVerification(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
            const file = files?.['pdf']?.[0]; 
            
            if (!process.env.SECRET_KEY) {
                throw new Error("Missing SECRET_KEY environment variable");
                }
            const secretKey: string = process.env.SECRET_KEY;
            console.log(secretKey);

            if (!file) {
            res.status(400).json({ error: "No PDF provided (field 'pdf')." });
            return;
            }
            const result = await FUAFromVisitService.hashSignatureVerification(file.buffer, secretKey);
            res.status(200).json({result: result});

        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to verify the signature of a pdf in FUAFromVisit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    },

    async generateSignedPdf(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string;
        
        let pdfBytes = null;
        
        try {
            pdfBytes = await FUAFromVisitService.generatePDFFromId(id);
            const pdfBytesSigned = await FUAFromVisitService.pdfMetadataHashSignature(pdfBytes, process.env.SECRET_KEY);
                
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Disposition", `inline; filename="${"FUA-"+id}.pdf"`);
            res.status(200).end(pdfBytesSigned);
    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to generate a pdf in FUAFromVisit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void> {
        try {
            const listFUASection = await FUAFromVisitService.listAll();
            res.status(200).json(listFUASection);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA From Visit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void> {
        const payload = req.params.id as string;

        let searchedFUA = null;

        try {
            searchedFUA = await FUAFromVisitService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUA === null){
                res.status(404).json({
                    error: `FUA From Visit by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUA);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA From Visit. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }     
    },

    async addFUAinQueue(req: Request, res: Response): Promise<void>{
        const fuaUUID = req.query.uuid;
        const fuaVisitUUID = req.query.visitUuid;
        try{
            FUAFromVisitService.addFUAinQueue(fuaUUID, fuaVisitUUID);
            res.status(200).json({result : `FUA ${fuaUUID} added in the queue.`});
        }catch (err: any) {
            res.status(500).json({
                error: 'Failed to add a FUA in the Queue. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    },

    async addFUAinQueueFromDatabase(req: Request, res: Response): Promise<void>{
        const fuaUUID = req.params.id as string;
        let fuaVisitUUID = null;
        try{
            const fuaFromVisitFromDatabase = await FUAFromVisitService.getByIdOrUUID(fuaUUID as string);
            if (fuaFromVisitFromDatabase === null){
                res.status(404).json({
                    error: `UUID '${fuaUUID}' couldnt be found in the database. `,
                });
            }
            const fuaVisitUUIDPayload = fuaFromVisitFromDatabase.payload;
            const fuaVisitUUIDParse = JSON.parse(fuaVisitUUIDPayload);
            fuaVisitUUID = fuaVisitUUIDParse.uuid;
            await FUAFromVisitService.addFUAinQueue(fuaUUID, fuaVisitUUID);
            
            res.status(200).json({result : `FUA ${fuaUUID} added in the queue.`});
        }catch (err: any) {
            res.status(500).json({
                error: 'Failed to add a FUA in the Queue. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    },
    
    async removeFUAFromQueue(req: Request, res: Response): Promise<void>{
        const fuaUUID = req.query.uuid;
        try{
            const fuaReference = FUAFromVisitService.removeFUAfromQueue(fuaUUID);
            res.status(200).json({uuid: (await fuaReference).getUUID()});
        }catch (err: any) {
            res.status(500).json({
                error: 'Failed to remove FUA from the Queue. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    }

};



export default FUAFromVisitController;

