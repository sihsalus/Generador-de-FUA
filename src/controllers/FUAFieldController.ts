import { Request, Response} from 'express';
import FUASectionService from '../services/FUASectionService';
import FUAFieldService from '../services/FUAFieldService';
import { FUAField } from '../modelsSequelize';



const FUAFieldController = {

    async create  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAField = null;
        try {
            newFUAField = await FUAFieldService.create(payload);
            res.status(201).json(newFUAField);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Field. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void>  {
        try {
            const listFUAFIelds = await FUAFieldService.listAll();
            res.status(200).json(listFUAFIelds);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Fields. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFormat = null;

        try {
            searchedFUAFormat = await FUAFieldService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFormat === null){
                res.status(404).json({
                    error: `FUA Field by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFormat);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Field. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    async getListByFUAFormat (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFields = [];

        try {
            searchedFUAFields = await FUAFieldService.getListByFUAFormatIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFields.length === 0){
                res.status(404).json({
                    error: `FUA Fields with FUA Format Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFields);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Field. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },
};

export default FUAFieldController;

