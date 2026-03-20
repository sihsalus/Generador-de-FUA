import express from 'express';
import ParameterTemplateController from '../controllers/ParameterTemplateController';
import { authenticate } from '../middleware/authentication';

const ParameterTemplateRouter = express.Router();

// ─── TEMPLATE CRUD ───
// POST   /ws/ParameterTemplate/ruleset/:ruleSetId/template      → Crear template
// GET    /ws/ParameterTemplate/ruleset/:ruleSetId/templates      → Listar templates del RuleSet
// GET    /ws/ParameterTemplate/template/:templateId              → Obtener template
// PUT    /ws/ParameterTemplate/template/:templateId              → Actualizar template
// DELETE /ws/ParameterTemplate/template/:templateId              → Eliminar template (soft delete)

ParameterTemplateRouter.post('/ruleset/:ruleSetId/template', authenticate, ParameterTemplateController.createTemplate);
ParameterTemplateRouter.get('/ruleset/:ruleSetId/templates', authenticate, ParameterTemplateController.listByRuleSet);
ParameterTemplateRouter.get('/template/:templateId', authenticate, ParameterTemplateController.getTemplate);
ParameterTemplateRouter.put('/template/:templateId', authenticate, ParameterTemplateController.updateTemplate);
ParameterTemplateRouter.delete('/template/:templateId', authenticate, ParameterTemplateController.deleteTemplate);

export default ParameterTemplateRouter;
