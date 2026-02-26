import { Request, Response} from 'express';
import FUASectionService from '../services/FUASectionService';



const FUASectionController = {

    async create  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUASection = null;
        try {
            newFUASection = await FUASectionService.create(payload);
            res.status(201).json(newFUASection);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Section. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void>  {
        try {
            const listFUASection = await FUASectionService.listAll();
            res.status(200).json(listFUASection);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Sections. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFormat = null;

        try {
            searchedFUAFormat = await FUASectionService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFormat === null){
                res.status(404).json({
                    error: `FUA Page by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFormat);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Page. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },
};

export default FUASectionController;

