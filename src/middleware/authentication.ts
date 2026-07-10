import { Request, Response, NextFunction } from 'express';
require('dotenv').config();

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    
    const token  = req.headers['fuagentoken'];

    if ( !token ) {
        return next(
            res.status(401).json({
                error: 'Authentication error. ', 
                message: 'No token provided in authorization header. ',
            })
        );    
    };


    // Check token
    if( ! (token === process.env.TOKEN) ) {
        return next(
            res.status(401).json({
                error: 'Authentication error. ', 
                message: 'Token was not authenticated. ',
            })
        );
    }
    return next();
};