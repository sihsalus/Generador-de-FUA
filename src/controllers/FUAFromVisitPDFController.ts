import { Request, Response} from 'express';
import FUAFromVisitPDFService from '../services/FUAFromVisitPDFService';
import { paginationWrapper } from '../utils/newPaginationWrapper';

const FUAFromVisitPDFController = {

    async listAll (req: Request, res: Response): Promise<void> {
        try {
            const listFUAFromVisitPDF = await paginationWrapper(
                req,
                FUAFromVisitPDFService.listAll
            );
            res.status(200).json(listFUAFromVisitPDF);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to list FUA From Visit PDF. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        }    
    },

    async getPDF (req: Request, res: Response): Promise<void> {
        const id = req.params.id;
        try{
            const pdfBytes = await FUAFromVisitPDFService.getPDF(id);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Disposition", 'inline; filename="pdfFromFUAFromVisitPDF.pdf"');
            res.status(200).send(pdfBytes);
        } catch (err: any) {
            res.status(500).json({
                error: 'Failed to get FUA From Visit PDF Bytes. (Controller)', 
                message: (err as (Error)).message,
                details: (err as any).details ?? null, 
            });
        } 
    }

};

export default FUAFromVisitPDFController;