import express from 'express';
import RuleEvaluationController from '../controllers/RuleEvaluationController';
import { authenticate } from '../middleware/authentication';

const EvaluateRouter = express.Router();

// POST /ws/Evaluate/rule/:ruleId        → Evaluar una regla individual
// POST /ws/Evaluate/ruleset/:ruleSetId  → Evaluar todas las reglas de un RuleSet

EvaluateRouter.post('/rule/:ruleId', authenticate, RuleEvaluationController.evaluateRule);
EvaluateRouter.post('/ruleset/:ruleSetId', authenticate, RuleEvaluationController.evaluateRuleSet);

export default EvaluateRouter;
