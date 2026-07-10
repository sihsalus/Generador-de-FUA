
import { FUAFromVisitModel } from "../../modelsSequelize";
import { encryptBuffer } from "../../middleware/dataEncryption";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? '123456789012';

class FUAFromVisitImplementation {

    // Creation of FUA From Visit
    async createSequelize(data: {
        // FUAFromVisit Data
        payload: string; 
        schemaType: string;
        outputType: string;
        output: Buffer;
        // FUAFormatFromSchema Identifier
        FUAFormatFromSchemaId: number;
        // Audit Data
        createdBy: string;
    }) {
        let returnedFUA = null;
        // Pass payload to Buffer
        //const encryptedPayload = encryptBuffer(ENCRYPTION_KEY, Buffer.from(data.payload));
        try {
            returnedFUA = await FUAFromVisitModel.create({
                ...data, 
                checksum: "-"});
        } catch (err: unknown){
            console.error('Error in FUA From Visit Sequelize Implementation: Couldnt create FUA From Visit in database using Sequelize. ', err);
            (err as Error).message =  'Error in FUA From Visit Sequelize Implementation: Couldnt create FUA From Visit in database using Sequelize: ' + (err as Error).message;
            throw err;
        }        

        return returnedFUA;
    };

    // List FUA 
    // Pending to paginate results
    async listAllSequelize() {
        let returnedFUAs = [];
        try {
            returnedFUAs = await FUAFromVisitModel.findAll({
                where: {
                    active: true,
                },
            });

        } catch (err: unknown){
            console.error('Error in FUA From Visit Sequelize Implementation: Couldnt list all FUA From Visit in database using Sequelize. ', err);
            (err as Error).message =  'Error in FUA From Visit Sequelize Implementation: Couldnt list all FUA From Visit in database using Sequelize. ' + (err as Error).message;
            throw err;
        }        

        return returnedFUAs;
    };

    // Get FUA From Visit by id 
    async getByIdSequelize(id: number ) {

        let returnedFUAFormat = null;
        try {
            returnedFUAFormat = await FUAFromVisitModel.findOne({
                where: {
                    id: id,
                    active: true,
                },
            });


        } catch (err: unknown){
            console.error(`Error in FUA From Visit Sequelize Implementation: Couldnt retrieve findOne identified by Id "${id}". `, err);
            (err as Error).message =  `Error in FUA From Visit Sequelize Implementation: Couldnt retrieve findOne identified by Id "${id}" . ` + (err as Error).message;
            throw err;
        }
     

        return returnedFUAFormat;
    };

    // Get FUA From Visit by UUID
    async getByUUIDSequelize(uuid: string ) {

        let returnedFUA = null;
        try {
            returnedFUA = await FUAFromVisitModel.findOne({
                where: {
                    uuid: uuid,
                    active: true,
                }
            });
            

        } catch (err: unknown){
            console.error(`Error in FUA From Visit Sequelize Implementation: Couldnt retrieve FUA From Visit Id identified by UUID '${uuid}' . `, err);
            (err as Error).message =  `Error in FUA From Visit Sequelize Implementation: Couldnt retrieve FUA From Visit Id identified by UUID '${uuid}' . ` + (err as Error).message;
            throw err;
        }   
        
        return returnedFUA;
    };

};

export default new FUAFromVisitImplementation();
