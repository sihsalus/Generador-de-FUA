import express from 'express';
import GraphRuleController from '../controllers/GraphRuleController';
import { authenticate } from '../middleware/authentication';

const GraphRuleRouter = express.Router();

// ─── RULE CRUD ───
// POST   /ws/GraphRule/ruleset/:ruleSetId/rule          → Crear regla completa con grafo
// GET    /ws/GraphRule/ruleset/:ruleSetId/rules          → Listar reglas del RuleSet
// GET    /ws/GraphRule/rule/:ruleId                      → Obtener regla completa con grafo
// PUT    /ws/GraphRule/rule/:ruleId                      → Actualizar metadata de regla
// DELETE /ws/GraphRule/rule/:ruleId                      → Eliminar regla (soft delete)

GraphRuleRouter.post('/ruleset/:ruleSetId/rule', authenticate, GraphRuleController.createFullRule);
GraphRuleRouter.get('/ruleset/:ruleSetId/rules', authenticate, GraphRuleController.listRulesByRuleSet);
GraphRuleRouter.get('/rule/:ruleId', authenticate, GraphRuleController.getFullRule);
GraphRuleRouter.put('/rule/:ruleId', authenticate, GraphRuleController.updateRule);
GraphRuleRouter.delete('/rule/:ruleId', authenticate, GraphRuleController.deleteRule);

// ─── GRAPH REPLACEMENT ───
// PUT    /ws/GraphRule/rule/:ruleId/graph                → Reemplazar grafo completo

GraphRuleRouter.put('/rule/:ruleId/graph', authenticate, GraphRuleController.replaceGraph);

// ─── NODE OPERATIONS ───
// POST   /ws/GraphRule/rule/:ruleId/node                 → Agregar nodo
// PUT    /ws/GraphRule/rule/:ruleId/node/:nodeId          → Actualizar nodo
// DELETE /ws/GraphRule/rule/:ruleId/node/:nodeId          → Eliminar nodo (+ cascade aristas)

GraphRuleRouter.post('/rule/:ruleId/node', authenticate, GraphRuleController.addNode);
GraphRuleRouter.put('/rule/:ruleId/node/:nodeId', authenticate, GraphRuleController.updateNode);
GraphRuleRouter.delete('/rule/:ruleId/node/:nodeId', authenticate, GraphRuleController.removeNode);

// ─── BATCH OPERATIONS ───
// POST   /ws/GraphRule/rule/:ruleId/conditions/batch     → Crear múltiples condiciones + GATE en batch

GraphRuleRouter.post('/rule/:ruleId/conditions/batch', authenticate, GraphRuleController.addConditionBatch);

// ─── EDGE OPERATIONS ───
// POST   /ws/GraphRule/rule/:ruleId/edge                 → Agregar arista
// DELETE /ws/GraphRule/rule/:ruleId/edge/:edgeId          → Eliminar arista

GraphRuleRouter.post('/rule/:ruleId/edge', authenticate, GraphRuleController.addEdge);
GraphRuleRouter.delete('/rule/:ruleId/edge/:edgeId', authenticate, GraphRuleController.removeEdge);

// ─── VALIDATION ───
// GET    /ws/GraphRule/rule/:ruleId/validate              → Validar grafo

GraphRuleRouter.get('/rule/:ruleId/validate', authenticate, GraphRuleController.validateGraph);

// ─── IMPORT / EXPORT ───
// POST   /ws/GraphRule/ruleset/:ruleSetId/import          → Importar reglas desde JSON
// POST   /ws/GraphRule/ruleset/:ruleSetId/import-bara     → Importar .bara completo (templates + lookups + reglas) en una transacción
// GET    /ws/GraphRule/rule/:ruleId/export                 → Exportar regla a JSON
// GET    /ws/GraphRule/ruleset/:ruleSetId/export           → Exportar RuleSet completo a JSON

GraphRuleRouter.post('/ruleset/:ruleSetId/import', authenticate, GraphRuleController.importFromJSON);
GraphRuleRouter.post('/ruleset/:ruleSetId/import-bara', authenticate, GraphRuleController.importFromBARA);
GraphRuleRouter.get('/rule/:ruleId/export', authenticate, GraphRuleController.exportRuleToJSON);
GraphRuleRouter.get('/ruleset/:ruleSetId/export', authenticate, GraphRuleController.exportRuleSetToJSON);

export default GraphRuleRouter;
