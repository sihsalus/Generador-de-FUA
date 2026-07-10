import {z} from "zod";
import { parse } from 'jsonc-parser';


import { isValidUUIDv4 } from "../utils/utils";
import FUAFormatFromSchemaImplementation from "../implementation/sequelize/FUAFormatFromSchemaImplementation";
import { inspect } from "util";
import BaseEntityVersionService from "./BaseEntityVersionService";
import FUAFormat, { FUAFormatSchema } from "../modelsTypeScript/FUAFormat";
import { Version_Actions } from "../utils/VersionConstants";
import FUAMappingImplementation from "../implementation/sequelize/FUAMappingImplementation";
import FUAMapping from "../modelsTypeScript/FUAMapping";

// Schemas

const newFUAFormatFromSchemaZod = z.object({
    // Format Data
    name: z.string(),
    code: z.string(),
    // Audit Data
    createdBy: z.string(),
});

const editFUAFormatFromSchemaZod = z.object({
    // Format Data
    uuid: z.string(),
    name: z.string(),
    content: z.string(),
    // Base Field Form Data
    codeName: z.string(),    
    versionTag: z.string(),
    versionNumber: z.number().int().positive(), // must be a positive integer
    updatedBy: z.string()
});


const deleteFUAFormatFromSchemaZod = z.object({
    // Format Data
    uuid: z.string(),
    // Delete Data
    active : z.boolean(),
    inactiveBy: z.string(),
    inactiveReason: z.string()
});


class FUAMappingService {
    /* paginateSimple(paginationParams: { page: string | ParsedQs | (string | ParsedQs)[] | undefined; pageSize: string | ParsedQs | (string | ParsedQs)[] | undefined; }, baseEntityPaginationParams: { id: string | ParsedQs | (string | ParsedQs)[] | undefined; uuid: string | ParsedQs | (string | ParsedQs)[] | undefined; createdBy: string | ParsedQs | (string | ParsedQs)[] | undefined; updatedBy: string | ParsedQs | (string | ParsedQs)[] | undefined; active: string | ParsedQs | (string | ParsedQs)[] | undefined; includeInactive: string | ParsedQs | (string | ParsedQs)[] | undefined; inactiveBy: string | ParsedQs | (string | ParsedQs)[] | undefined; inactiveAt: string | ParsedQs | (string | ParsedQs)[] | undefined; beforeInactiveAt: string | ParsedQs | (string | ParsedQs)[] | undefined; afterInactiveAt: string | ParsedQs | (string | ParsedQs)[] | undefined; inactiveReason: string | ParsedQs | (string | ParsedQs)[] | undefined; }) {
        throw new Error('Method not implemented.');
    } */

    // Creation of FUA Mapping
    async create(data: {
        // Format Data
        name: string;
        code: string;
        // Audit Data
        createdBy: string;
    }) {
        // Object validation
        const result = newFUAFormatFromSchemaZod.safeParse(data);
        if( !result.success){
            console.error('Error in FUA Mapping Service - create: ZOD validation. \n', result.error);
            const newError = new Error('Error in FUA Mapping Service - create: ZOD validation. ');
            (newError as any).details = result.error;
            throw newError;
        }
        
        // FUAMapping creation
        let returnedFUAMapping = null;
        try {
            returnedFUAMapping = await FUAMappingImplementation.createSequelize({
                // Mapping Data
                name: data.name,
                code: data.code,
                // Audit Data
                createdBy: data.createdBy,
            });
        } catch (err: any){
            (err as Error).message =  'Error in FUA Mapping Service:  ' + (err as Error).message;
            throw err;
        }

        // Insert version 
        try{
            let newVersion = await BaseEntityVersionService.create(
                new FUAMapping(returnedFUAMapping.dataValues),
                "FUAMapping",
                Version_Actions.CREATE,
                undefined
            );
        }catch(error: any){
            (error as Error).message =  'Error in FUA Mapping Service:  ' + (error as Error).message;
            throw error;
        }

        return {
            uuid: returnedFUAMapping.uuid
        };
    };

    // List FUA Formats
    // Pending to paginate results

    /*
    string ->
        string
        boolean
        integerNumber

        let f = new QueryFactory();

        includeInactive ("true")

        {
            {"id", "integer"}
            {"includeInactive", "boolean"}
        }

        foreach(){
            includeInactive = f.build("boolean",includeInactive)
            catch ...

            includeInactive = f.build("integer",includeInactive)
            catch ...
        }

        Controller -> Query Parameters (pagination, baseEntity, specific query parameters) -> service
    */
    // (query param)  
    //Controller -> (Wrapper only query parameters) (pagination,serachParameters) ->  (funtion to porcess query) Service -> Implementation -> Wrapper

    /*
    x -> serviceOfWthatever()

    return


    ||||

    QueryWrapper(params, service to call)

    function Wrapper(params, service FUAFormarmatDFromSchemaService.listAll / FUAService.listAll){
    
        let sanitizedParams = ..(params)
        let answer = service(sanitizedParams (paginationParams, baseEntityParams,entitityParams) )
        let finalAnswer = paginationWrapper(answer)
        return finalAnswer    
    }

    //Controller -> Wrapper (query, and database return) -> Service -> Implementation    

    */

    /*
    array of something

    {
        results: array
        count: length(array)
    }

    */
        
        
    async listAll(findOptions : {
        where: any,
        limit: any,
        offset: any,
        order: any
    }) {
        
        let returnedFUAFormats = null;
        try {
            returnedFUAFormats = await FUAFormatFromSchemaImplementation.listAllSequelize(findOptions);

        } catch (err: any){
            (err as Error).message =  'Error in FUA Format From Schema Service: ' + (err as Error).message;
            throw err;
        }        

        return returnedFUAFormats;
    };

    // Get FUA Mapping by Id (Id or UUID)
    async getByIdOrUUID( idReceived: string ) {
        let returnedFUAFormat = null;

        // Check if UUID or Id was sent
        let id = null;
        const nuNumber = Number(idReceived);
        if( Number.isInteger(nuNumber) ){
            id = nuNumber;

            try {
                returnedFUAFormat = await FUAFormatFromSchemaImplementation.getByIdSequelize(id);

            } catch (err: any){
                (err as Error).message =  'Error in FUA Format From SchemaFUA Format From Schema Service: ' + (err as Error).message;   
                throw err;
            }     
        }else{
            // Get id by UUID
            //Validate UUID Format        
            if (!isValidUUIDv4(idReceived) ) {
                throw new Error("Error in FUA Format From Schema Service: Invalid UUID format. ");
            }
            try {

                returnedFUAFormat = await FUAFormatFromSchemaImplementation.getByUUIDSequelize(idReceived);

            } catch (err: unknown){
                (err as Error).message =  'Error in FUA Format From Schema Service: ' + (err as Error).message;
                throw err;
            }
            
        }      
        // If nothing was offund, return a null
        return returnedFUAFormat;
    };

    // Get FUA Format Id by UUID
    async getIdByUUID( uuidReceived: string){
        let returnedFUAFormats = null;

        //Validate UUID Format        
        if (!isValidUUIDv4(uuidReceived) ) {
            throw new Error("Error FUA Format From Schema Service - getIdByUUID: Invalid UUID format. ");
        }

        try {
            returnedFUAFormats = await FUAFormatFromSchemaImplementation.getByUUIDSequelize(uuidReceived);

        } catch (err: unknown){
            console.error('Error in FUA Format From Schema Service - getIdByUUID: ', err);
            (err as Error).message =  'Error in FUA Format From Schema Service- getIdByUUID: ' + (err as Error).message;
            throw err;
        }

        // If nothing was found, it will return a null
        return returnedFUAFormats
    }


    // Edit of FUA Mapping
    async edit(data: {
        // Format Data
        uuid: string;
        name: string;
        content?: string;
        // Version Data
        codeName: string;
        versionTag: string; 
        versionNumber: number;
        // Audit Data
        updatedBy: string;
    }) {
        // Object Validation
        const result = editFUAFormatFromSchemaZod.safeParse(data);
        if( !result.success ){
            const newError = new Error('Error in FUA Format From Schema Service - editFUAFormat: ZOD validation. ');
            (newError as any).details = result.error;
            throw newError;
        }
        
        // FUAFormat edit
        let returnedFUAFormat = null;
        try {
            returnedFUAFormat = await FUAFormatFromSchemaImplementation.editSequelize({
                // Format Data
                uuid: data.uuid,
                name: data.name,
                content: data.content,
                // Version Data
                codeName: data.codeName,
                versionTag: data.versionTag , 
                versionNumber: data.versionNumber,
                updatedBy: data.updatedBy
            });
        } catch (err: unknown){
            (err as Error).message =  'Error in FUA Format From Schema Service: \n' + (err as Error).message;
            throw err;
        }
        
        if (returnedFUAFormat == null){
            return null;
        }

        // Insert version
        try{
            let newVersion = await BaseEntityVersionService.create(
                new FUAFormat(returnedFUAFormat.dataValues),
                "FUAFormatFromSchema",
                Version_Actions.EDIT,
                undefined
            );
        }catch(error: any){
            (error as Error).message = 'Error in FUA Format From Schema Service:  ' + (error as Error).message;
            const long = inspect(error, { depth: 10, colors: false });
            (error as any).details = (error as any).details ?? long;
            throw error;
        }

    
        return {
            uuid: returnedFUAFormat.uuid
        };
    };

    // Delete of FUA Mapping
    async delete(data: {
        // Format Data
         uuid: string;
        active: boolean;
        inactiveBy: string;
        inactiveReason: string;
    }) {
        // Object Validation
        const result = deleteFUAFormatFromSchemaZod.safeParse(data);
        if( !result.success ){
            const newError = new Error('Error in FUA Format From Schema Service - deleteFUAFormat: ZOD validation. ');
            (newError as any).details = result.error;
            throw newError;
        }
        
        // FUAFormat delete (edit of the delete related attributs)
        let returnedFUAFormat = null;
        try {
            returnedFUAFormat = await FUAFormatFromSchemaImplementation.editDeleteVersionSequelize({
                // Format Data
                uuid: data.uuid,
                // Delete Data
                active: data.active,
                inactiveBy: data.inactiveBy,
                inactiveReason: data.inactiveReason,

            });
        } catch (err: unknown){
            (err as Error).message =  'Error in FUA Format From Schema Service: \n' + (err as Error).message;
            throw err;
        }
        if (returnedFUAFormat == null){
            return null;
        }

         // Insert version
        try{
            let newVersion = await BaseEntityVersionService.create(
                new FUAFormat(returnedFUAFormat.dataValues),
                "FUAFormatFromSchema",
                Version_Actions.DELETE,
                undefined
            );
        }catch(error: any){
            (error as Error).message = 'Error in FUA Format From Schema Service:  ' + (error as Error).message;
            const long = inspect(error, { depth: 10, colors: false });
            (error as any).details = (error as any).details ?? long;
            throw error;
        }

        return {
            uuid: returnedFUAFormat.uuid
        };
    };

    async loadMappingFromUUID(uuidReceived: string){
        // Validate UUID Format
        if (!isValidUUIDv4(uuidReceived)) {
            throw new Error("Error in FUA Mapping Service - loadMappingFromUUID: Invalid UUID format. ");
        }

        // Get FUAMapping from Database
        let returnedFUAMapping = null;
        try {
            returnedFUAMapping = await FUAMappingImplementation.getByUUIDSequelize(uuidReceived);
        } catch (err: unknown){
            console.error('Error in FUA Mapping Service - loadMappingFromUUID: ', err);
            (err as Error).message = 'Error in FUA Mapping Service - loadMappingFromUUID: ' + (err as Error).message;
            throw err;
        }

        // If nothing was found, it will return a null
        return returnedFUAMapping;
    }
};

export default new FUAMappingService();
