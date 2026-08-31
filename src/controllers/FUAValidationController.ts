import { Request, Response } from "express";
import FUAValidationService from "../services/FUAValidationService";

const FUAValidationController = {

    async validateRC(req: Request, res: Response): Promise<void> {
        const payload = req.body?.payload;

        if (!payload || typeof payload !== "object") {
            res.status(400).json({ error: "Missing or invalid 'payload' in request body." });
            return;
        }

        try {
            const summary = await FUAValidationService.validateRC(payload);
            res.status(200).json(summary);
        } catch (err: any) {
            res.status(500).json({
                error:   "Failed to validate FUA. (Controller)",
                message: (err as Error).message,
                details: (err as any).details ?? null,
            });
        }
    },

};

export default FUAValidationController;
