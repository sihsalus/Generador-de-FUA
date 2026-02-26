import { Request, Response} from 'express';
import FUAFieldColumnService from '../services/FUAFieldColumnService';
import FUAFieldRowService from '../services/FUAFieldRowService';



const FUAFieldRowController = {

    async create  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAFieldRow = null;
        try {
            newFUAFieldRow = await FUAFieldRowService.create(payload);
            res.status(201).json(newFUAFieldRow);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Field Row. (Controller - create)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void>  {
        try {
            const listFUAFieldRows = await FUAFieldRowService.listAll();
            res.status(200).json(listFUAFieldRows);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Field Rowss. (Controller - listAll)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFieldRow = null;

        try {
            searchedFUAFieldRow = await FUAFieldColumnService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFieldRow === null){
                res.status(404).json({
                    error: `FUA Field Row by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFieldRow);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Field Row. (Controller - getById)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },
};

export default FUAFieldRowController;

