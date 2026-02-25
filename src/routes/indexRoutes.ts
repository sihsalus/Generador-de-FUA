import express from 'express';

// Import Routes from entities or others
import FUASectionRouter from './FUASectionRoutes';
import FUAFieldRouter from './FUAFieldRoutes';
import FUAFieldColumnRouter from './FUAFieldColumnRoutes';
import FUAFieldRowRouter from './FUAFieldRowRoutes';
import FUAFieldCellRouter from './FUAFieldCellRoutes';
import FUAFromVisitRouter from './FUAFromVisitRouter';
import FUAFormatFromSchemaRouter from './FUAFormatFromSchemaRoutes';
import BaseEntityVersionRouter from './BaseEntityVersionRoutes';
import FUAFromVisitPDFRouter from './FUAFromVisitPDFRoutes';

import RuleSetRouter    from './RuleSetRoutes';
import GraphRuleRouter  from './GraphRuleRoutes';


const globalRouter = express.Router();

globalRouter.use('/RuleSet', RuleSetRouter);
globalRouter.use('/GraphRule', GraphRuleRouter);
//globalRouter.use('/FUAFormat', FUAFormatRouter);
globalRouter.use('/FUAFormat', FUAFormatFromSchemaRouter);
globalRouter.use('/FUASection', FUASectionRouter);
globalRouter.use('/FUAField', FUAFieldRouter);
globalRouter.use('/FUAFieldColumn', FUAFieldColumnRouter);
globalRouter.use('/FUAFieldRow', FUAFieldRowRouter);
globalRouter.use('/FUAFieldCell', FUAFieldCellRouter);
globalRouter.use('/FUAFromVisit', FUAFromVisitRouter);
globalRouter.use('/FUAFromVisitPDF', FUAFromVisitPDFRouter);
globalRouter.use('/BaseEntityVersion', BaseEntityVersionRouter);


export default globalRouter;
