// Libraries
import { Request, Response} from 'express';
const fs = require('fs');
const path = require('path');
import { parse } from 'jsonc-parser';
import FUAFormatFromSchemaService from '../services/FUAFormatFromSchemaService';
import { inspect } from "util";
import { pdfMetadataHashSignatureVerification } from '../utils/PDF_HASH_Signature';

// Other imports
import {Log} from '../middleware/logger/models/typescript/Log';
import { loggerInstance } from '../middleware/logger/models/typescript/Logger';
import { Logger_LogLevel } from '../middleware/logger/models/typescript/LogLevel';
import { Logger_SecurityLevel } from '../middleware/logger/models/typescript/SecurityLevel';
import { Logger_LogType } from '../middleware/logger/models/typescript/LogType';
import { transactionInst } from '../middleware/globalTransaction';
import { UUID } from 'sequelize';
import { paginationWrapper } from '../utils/newPaginationWrapper';
import dotenv from "dotenv";
import { log } from 'console';
dotenv.config();


class FUAFormatFromSchemaController {
    // Private attribute holding the entity name
    private readonly entityName: string = "FUAFormatFromSchema";

    create = async (req: Request, res: Response): Promise<void> => {
        
        try {
            const controllerBody = req.body;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            const file = files['formatPayload']?.[0];
            
            const jsoncContent = file.buffer.toString('utf-8');
            const parsed = parse(jsoncContent);

            // Parsed payload wasn't a jsonc object
            if(parsed === undefined){
                let auxError = new Error('Error in FUA Format From Schema Controller - create: File sent wasnt jsonc compliant (parsing error). ');
                throw auxError;
            }

            // Validation parsing validation pending needed

            let newFUAFormat = null;
            newFUAFormat = await FUAFormatFromSchemaService.create({
                name: controllerBody.name,
                content: jsoncContent,
                codeName: controllerBody.name  ?? controllerBody.name.toString(),
                versionTag: controllerBody.versionTag ?? controllerBody.name.toString() + '_1',
                versionNumber: controllerBody.versionNumber ?? 1,
                createdBy: controllerBody.createdBy,  
            });
            
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                content: {
                    object: {
                        name: this.entityName,
                        uuid: newFUAFormat.uuid ?? '---'                        
                    }
                },
                description: ("Creating FUA Format From Schema Successful")
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);   

            res.status(201).json(newFUAFormat);   
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Format From Schema. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });

            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.CREATE,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        }     
    };

    // Pending pagination
    listAll = async (req: Request, res: Response): Promise<void> => {
        try {

            // pagination object (passed through listAll)
            const paginationParams = {
                page: req.query.page,
                pageSize: req.query.pageSize,
            };

            const baseEntityPaginationParams = {
                id: req.query.id,
                uuid: req.query.uuid,
                createdBy: req.query.createdBy,
                updatedBy: req.query.updatedBy,
                active: req.query.active,
                includeInactive : req.query.includeInactive,
                inactiveBy: req.query.inactiveBy,
                inactiveAt: req.query.inactiveAt,
                beforeInactiveAt: req.query.beforeInactiveAt,
                afterInactiveAt: req.query.afterInactiveAt,
                inactiveReason: req.query.inactiveReason,
                beforeCreatedAt: req.query.beforeCreatedAt,
                afterCreatedAt: req.query.afterCreatedAt,
                beforeUpdatedAt: req.query.beforeUpdatedAt,
                afterUpdatedAt: req.query.afterUpdatedAt
            };

            const listFUAFormats = await paginationWrapper(paginationParams, baseEntityPaginationParams);
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                content: {
                    objectName: this.entityName,
                    object: listFUAFormats.rows.map( (auxFuaFormat : any) => ({
                        uuid:  auxFuaFormat.uuid
                    }))
                },
                description: ("Listing all FUA Formats From Schema Successful")
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"}, 
                { name: "database" }
            ]);   

            res.status(200).json({
                results: listFUAFormats.rows,
                page: paginationParams.page,
                pageSize: paginationParams.pageSize,
                totalPages: listFUAFormats.pages,
                totalResults: listFUAFormats.total
            });
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Formats From Schema. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        } 
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        const payload = req.params.id as string;


        let searchedFUAFormat = null;

        try {
            searchedFUAFormat = await FUAFormatFromSchemaService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFormat === null){
                res.status(404).json({
                    error: `FUA Format by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFormat);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Format. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        }
        let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.READ,
                environmentType: loggerInstance.enviroment.toString(),
                description: ("Getting FUA Format by Id or UUID Successful")
        });
        loggerInstance.printLog(auxLog, [
            { name: "terminal" },
            { name: "file", file: "logs/auxLog.log"},
            { name: "database" }
        ]);
            
    };

    // Render FUA Format by Id or UUID
    render = async (req: Request, res: Response): Promise<void> => {
        const formatidentifier = req.params.id as string;
        //const visitpayload = req.body.payload;
     
        let htmlContent = null;

        try {
            htmlContent = await FUAFormatFromSchemaService.renderById(formatidentifier);
            if(htmlContent === null){
                res.status(404).json({
                    error: `FUA Format by Id or UUID '${formatidentifier}' couldnt be found. `, 
                });
                return;
            }                
            res.status(200).send(htmlContent); 
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.INFO,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: ("Rendering FUA Format by Id or UUID Successful")
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);   
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to render FUA Format. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.SYSTEM,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        }   
    };

    edit = async (req: Request, res: Response): Promise<void> => {
        const controllerBody = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const file = files['formatPayload']?.[0];

         
        const jsoncContent = file.buffer.toString('utf-8');
        const parsed = parse(jsoncContent);

        // Validation parsing validation pending needed

        let editFUAFormat = null;
        try {
            transactionInst.renewTransaction()
            editFUAFormat = await FUAFormatFromSchemaService.edit({
                uuid: req.params.id as string,
                name: controllerBody.name,
                content: jsoncContent,
                codeName: controllerBody.name  ?? controllerBody.name.toString(),
                versionTag: controllerBody.versionTag ?? controllerBody.name.toString() + '_1',
                versionNumber: controllerBody.versionNumber ?? 1,
                updatedBy: controllerBody.updatedBy
            });
            if (editFUAFormat == null){
                res.status(304).json({
                    error: `FUA Field by UUID '${controllerBody.uuid}' couldnt be found. `,
                });
                return;
            }
              
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: ("Editing FUA Format From Schema Successful")
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);  
            transactionInst.confirmTransaction();
            res.status(200).json(editFUAFormat);
        } catch (err: any) {
            transactionInst.unconfirmTransaction();
            res.status(500).json({
                error: 'Failed to edit FUA Format From Schema. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.EDIT,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        }
            
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        const controllerBody = req.body;
        //const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        //const file = files['formatPayload']?.[0];
         
        //const jsoncContent = file.buffer.toString('utf-8');
        //const parsed = parse(jsoncContent);

        // Validation parsing validation pending needed

        let deleteFUAFormat = null;
        try {
            transactionInst.renewTransaction()
            deleteFUAFormat = await FUAFormatFromSchemaService.delete({
                uuid: req.params.id as string,
                active: false,
                inactiveBy: controllerBody.inactiveBy,
                inactiveReason: controllerBody.inactiveReason
            });

            if (deleteFUAFormat == null){
                res.status(304).json({
                    error: `FUA Field by UUID '${controllerBody.uuid}' couldnt be found. `,
                });
                return;
            }
              
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: ("Deleting FUA Format From Schema Successful")
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);  
            transactionInst.confirmTransaction();
            res.status(200).json(deleteFUAFormat);
        } catch (err: any) {
            transactionInst.unconfirmTransaction();
            res.status(500).json({
                error: 'Failed to delete FUA Format From Schema. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
            let auxLog = new Log({
                timeStamp: new Date(),
                logLevel: Logger_LogLevel.ERROR,
                securityLevel: Logger_SecurityLevel.Admin,
                logType: Logger_LogType.DELETE,
                environmentType: loggerInstance.enviroment.toString(),
                description: (err.message ? (err.message+'\n') : '') + (err.details ?? '')
            });
            loggerInstance.printLog(auxLog, [
                { name: "terminal" },
                { name: "file", file: "logs/auxLog.log"},
                { name: "database" }
            ]);
        }
            
    };

    async hashSignatureVerificationControllerTemporary (req: Request, res: Response): Promise<void>  {
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

            const result = await pdfMetadataHashSignatureVerification(file.buffer, secretKey);
            res.status(200).json(result);

        } catch (err: any) {
            console.error("Error in FUAFormatFromSchema Controller - pdfMetadataHashSignatureVerification:", err);
            res.status(500).json({
            error: "Failed to verify PDF signature. (Controller)",
            message: (err as Error).message,
            details: (err as any).details ?? null,
            });
        }
    };


}

export default new FUAFormatFromSchemaController();