import { Request, Response} from 'express';
import FUAFormatService from '../services/FUAFormatService';


class FUAFormatController {

    private entityName : string = "FUAFormat";

    static async createFUAFormat  (req: Request, res: Response): Promise<void>  {
        const payload = req.body;
        let newFUAFormat = null;
        try {
            newFUAFormat = await FUAFormatService.create(payload);
            
            res.status(201).json(newFUAFormat);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to create FUA Format. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
    };

    // Pending pagination
    static async listAllFUAFormats (req: Request, res: Response): Promise<void>  {
        try {
            const listFUAFormats = await FUAFormatService.listAll();
            res.status(200).json(listFUAFormats);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA Formats. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    };

    static async getFUAFormatById (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;

        let searchedFUAFormat = null;

        try {
            searchedFUAFormat = await FUAFormatService.getByIdOrUUID(payload);
            
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
        }
            
    };

    // Render FUA Format by Id or UUID
    static async render (req: Request, res: Response): Promise<void>  {
        const payload = req.params.id as string;
        const { token = "---", visit = "---" } = req.body ?? {};

        // Validate token
        
        let htmlContent = null;

        try {
            htmlContent = await FUAFormatService.renderById(payload);
            if(htmlContent === null){
                res.status(404).json({
                    error: `FUA Format by Id or UUID '${payload}' couldnt be found. `, 
                });
                return;
            }                
            res.status(200).send(htmlContent);    
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to render FUA Format. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }
            
    };
};

export default FUAFormatController;

