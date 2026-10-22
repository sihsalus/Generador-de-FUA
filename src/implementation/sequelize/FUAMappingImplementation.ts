
import { FUAMappingModel } from "../../modelsSequelize";


class FUAFromVisitImplementation {

    // Creation of FUA From Visit
    async createSequelize(data: {
        // FUAMapping Data
        name: string;
        code: string;
        // Audit Data
        createdBy: string;
    }) {
        let returnedFUAMapping = null;
        try {
            returnedFUAMapping = await FUAMappingModel.create(
                data
            );
        } catch (err: unknown){
            console.error('Error in FUA Mapping Sequelize Implementation: Couldnt create FUA Mapping in database using Sequelize. ', err);
            (err as Error).message =  'Error in FUA Mapping Sequelize Implementation: Couldnt create FUA Mapping in database using Sequelize: ' + (err as Error).message;
            throw err;
        }        

        return returnedFUAMapping;
    };

    // List FUAMappings
    // Pending to paginate results
    async listAllSequelize() {
        let returnedFUAMappings = [];
        try {
            returnedFUAMappings = await FUAMappingModel.findAll({
                where: {
                    active: true,
                },
            });

        } catch (err: unknown){
            console.error('Error in FUA Mapping Sequelize Implementation: Couldnt list all FUA Mapping in database using Sequelize. ', err);
            (err as Error).message =  'Error in FUA Mapping Sequelize Implementation: Couldnt list all FUA Mapping in database using Sequelize. ' + (err as Error).message;
            throw err;
        }        

        return returnedFUAMappings;
    };

    // Get FUA Mapping by id 
    async getByIdSequelize(id: number ) {

        let returnedFUAFormat = null;
        try {
            returnedFUAFormat = await FUAMappingModel.findOne({
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

        let returnedFUAMap = null;
        try {
            returnedFUAMap = await FUAMappingModel.findOne({
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
        
        return returnedFUAMap;
    };

};

export default new FUAFromVisitImplementation();
