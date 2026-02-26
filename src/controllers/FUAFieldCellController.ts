import { Request, Response} from 'express';
import FUAFieldColumnService from '../services/FUAFieldColumnService';
import FUAFieldRowService from '../services/FUAFieldRowService';
import FUAFieldCellService from '../services/FUAFieldCellService';



const FUAFieldCellController = {

    async create  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAFieldCell = null;
        try {
            newFUAFieldCell = await FUAFieldRowService.create(payload);
            res.status(201).json(newFUAFieldCell);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Field Cell. (Controller - create)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },

    // Pending pagination
    async listAll (req: Request, res: Response): Promise<void>  {
        try {
            const listFUAFieldCells = await FUAFieldCellService.listAll();
            res.status(200).json(listFUAFieldCells);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Field Cells. (Controller - listAll)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFieldCell = null;

        try {
            searchedFUAFieldCell = await FUAFieldCellService.getByIdOrUUID(payload);
            
            // In case nothing was found 
            if(searchedFUAFieldCell === null){
                res.status(404).json({
                    error: `FUA Field Cell by Id or UUID '${payload}' couldnt be found. `,
                });
                return;
            }

            res.status(200).json(searchedFUAFieldCell);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA Field Cell. (Controller - getById)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    },
};

export default FUAFieldCellController;

