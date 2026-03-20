import express from 'express';

// Import Routes from entities or others
import FUAFromVisitRouter from './FUAFromVisitRouter';
import FUAFormatFromSchemaRouter from './FUAFormatFromSchemaRoutes';
import BaseEntityVersionRouter from './BaseEntityVersionRoutes';
import FUAFromVisitPDFRouter from './FUAFromVisitPDFRoutes';

import RuleSetRouter       from './RuleSetRoutes';
import GraphRuleRouter     from './GraphRuleRoutes';
import LookupTableRouter   from './LookupTableRoutes';
import ParameterTemplateRouter from './ParameterTemplateRoutes';
import EvaluateRouter from './EvaluateRoutes';

const globalRouter = express.Router();

globalRouter.use('/Evaluate', EvaluateRouter);
globalRouter.use('/RuleSet', RuleSetRouter);
globalRouter.use('/GraphRule', GraphRuleRouter);
globalRouter.use('/LookupTable', LookupTableRouter);
globalRouter.use('/ParameterTemplate', ParameterTemplateRouter);
//globalRouter.use('/FUAFormat', FUAFormatRouter);
globalRouter.use('/FUAFormat', FUAFormatFromSchemaRouter);
globalRouter.use('/FUAFromVisit', FUAFromVisitRouter);
globalRouter.use('/FUAFromVisitPDF', FUAFromVisitPDFRouter);
globalRouter.use('/BaseEntityVersion', BaseEntityVersionRouter);


export default globalRouter;
