import { Request, Response} from 'express';
import FUAFieldColumnService from '../services/FUAFieldColumnService';



const FUAFieldColumnController = {

    async create  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAFieldColumn = null;
        try {
            newFUAFieldColumn = await FUAFieldColumnService.create(payload);
            res.status(201).json(newFUAFieldColumn);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Field Column. (Controller - create)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void>  {
        try {
            const listFUAFieldColumns = await FUAFieldColumnService.listAll();
            res.status(200).json(listFUAFieldColumns);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Fields. (Controller - listAll)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFieldColumn = null;

        try {
            searchedFUAFieldColumn = await FUAFieldColumnService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFieldColumn === null){
                res.status(404).json({
                    error: `FUA Field Column by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFieldColumn);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Field Column. (Controller - getById)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },
};

export default FUAFieldColumnController;

