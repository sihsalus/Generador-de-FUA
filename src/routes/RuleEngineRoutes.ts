import express from 'express';
import RuleEngineController from '../controllers/RuleEngineController';
import { authenticate } from '../middleware/authentication';

const RuleEngineRouter = express.Router();

/**
 * @swagger
 * /ws/rule-engine/validate:
 *   post:
 *     summary: Valida un VisitPayload contra todas las reglas FUARule activas
 *     tags: [RuleEngine]
 *     security:
 *       - fuagentoken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Resultado de validación
 *       400:
 *         description: Payload inválido
 *       401:
 *         description: No autorizado
 */
RuleEngineRouter.post('/validate', authenticate, RuleEngineController.validate);

export default RuleEngineRouter;
