import express from 'express';
import RuleSetController from '../controllers/RuleSetController';
import { authenticate } from '../middleware/authentication';

const RuleSetRouter = express.Router();

RuleSetRouter.post('/', authenticate, RuleSetController.createRuleSet);
RuleSetRouter.get('/', authenticate, RuleSetController.listAllRuleSets);
RuleSetRouter.get('/:id', authenticate, RuleSetController.getRuleSetById);
RuleSetRouter.put('/:id', authenticate, RuleSetController.updateRuleSet);
RuleSetRouter.delete('/:id', authenticate, RuleSetController.deleteRuleSet);

export default RuleSetRouter;
