import express from 'express';
import LookupTableController from '../controllers/LookupTableController';
import { authenticate } from '../middleware/authentication';

const LookupTableRouter = express.Router();

// ─── TABLE CRUD ───
// POST   /ws/LookupTable/ruleset/:ruleSetId/table          → Crear LookupTable vacía
// GET    /ws/LookupTable/ruleset/:ruleSetId/tables          → Listar LookupTables del RuleSet
// GET    /ws/LookupTable/table/:tableId                     → Obtener tabla completa con filas
// PUT    /ws/LookupTable/table/:tableId                     → Actualizar metadata de tabla
// DELETE /ws/LookupTable/table/:tableId                     → Eliminar tabla (soft delete + cascade filas)

LookupTableRouter.post('/ruleset/:ruleSetId/table', authenticate, LookupTableController.createTable);
LookupTableRouter.get('/ruleset/:ruleSetId/tables', authenticate, LookupTableController.listByRuleSet);
LookupTableRouter.get('/table/:tableId', authenticate, LookupTableController.getFullTable);
LookupTableRouter.put('/table/:tableId', authenticate, LookupTableController.updateTable);
LookupTableRouter.delete('/table/:tableId', authenticate, LookupTableController.deleteTable);

// ─── ROW OPERATIONS ───
// POST   /ws/LookupTable/table/:tableId/row                → Agregar fila
// PUT    /ws/LookupTable/table/:tableId/row/:rowId          → Actualizar fila
// DELETE /ws/LookupTable/table/:tableId/row/:rowId          → Eliminar fila (soft delete)

LookupTableRouter.post('/table/:tableId/row', authenticate, LookupTableController.addRow);
LookupTableRouter.put('/table/:tableId/row/:rowId', authenticate, LookupTableController.updateRow);
LookupTableRouter.delete('/table/:tableId/row/:rowId', authenticate, LookupTableController.deleteRow);

// ─── IMPORT / EXPORT ───
// POST   /ws/LookupTable/ruleset/:ruleSetId/import          → Importar tabla completa desde JSON
// GET    /ws/LookupTable/table/:tableId/export               → Exportar tabla a JSON

LookupTableRouter.post('/ruleset/:ruleSetId/import', authenticate, LookupTableController.importFullTable);
LookupTableRouter.get('/table/:tableId/export', authenticate, LookupTableController.exportFullTable);

export default LookupTableRouter;
