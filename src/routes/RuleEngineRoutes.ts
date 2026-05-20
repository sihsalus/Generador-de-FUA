import express from 'express';
import RuleEngineController from '../controllers/RuleEngineController';
import { authenticate } from '../middleware/authentication';

/**
 * Rutas para RuleEngine
 *
 * POST /ws/rule-engine/validate — Valida un VisitPayload contra todas las
 *                                  reglas FUARule activas y persiste el resultado
 */
const RuleEngineRouter = express.Router();

RuleEngineRouter.post('/validate', authenticate, RuleEngineController.validate);

export default RuleEngineRouter;
