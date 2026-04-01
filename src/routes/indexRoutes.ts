import express from 'express';

// Import Routes from entities or others
import FUAFromVisitRouter from './FUAFromVisitRouter';
import FUAFormatFromSchemaRouter from './FUAFormatFromSchemaRoutes';
import BaseEntityVersionRouter from './BaseEntityVersionRoutes';
import FUAFromVisitPDFRouter from './FUAFromVisitPDFRoutes';
import EntityScriptRouter from './EntityScriptRoutes';


const globalRouter = express.Router();

//globalRouter.use('/FUAFormat', FUAFormatRouter);
globalRouter.use('/FUAFormat', FUAFormatFromSchemaRouter);
globalRouter.use('/FUAFromVisit', FUAFromVisitRouter);
globalRouter.use('/FUAFromVisitPDF', FUAFromVisitPDFRouter);
globalRouter.use('/BaseEntityVersion', BaseEntityVersionRouter);
globalRouter.use('/entity-script', EntityScriptRouter);


export default globalRouter;
