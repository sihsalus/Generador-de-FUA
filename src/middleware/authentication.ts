import { Request, Response, NextFunction } from 'express';
require('dotenv').config();

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const expectedToken = process.env.TOKEN;
    if (!expectedToken) {
        res.status(503).json({
            error: 'Service configuration error.',
            message: 'Authentication is not configured.',
        });
        return;
    }

    const token = req.get('fuagentoken');

    if (!token || token !== expectedToken) {
        res.status(401).json({
            error: 'Authentication error.',
            message: 'Invalid or missing FUA generator token.',
        });
        return;
    }

    next();
};
