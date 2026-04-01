import express from 'express';
import EntityScriptExecutionController from '../controllers/EntityScriptExecutionController';
import EntityScriptCrudController from '../controllers/EntityScriptCrudController';
import { authenticate } from '../middleware/authentication';

/**
 * Rutas para EntityScript
 *
 * POST   /ws/entity-script/execute       — Ejecutar script ad-hoc
 * POST   /ws/entity-script/execute/:id   — Ejecutar script almacenado
 * POST   /ws/entity-script               — Crear script
 * GET    /ws/entity-script               — Listar scripts (?targetEntity=X)
 * GET    /ws/entity-script/:id           — Obtener script por ID
 * PUT    /ws/entity-script/:id           — Actualizar script
 */
const EntityScriptRouter = express.Router();

// --- Ejecución ---
EntityScriptRouter.post("/execute", authenticate, EntityScriptExecutionController.executeAdHoc);
EntityScriptRouter.post("/execute/:id", authenticate, EntityScriptExecutionController.executeStored);

// --- CRUD ---
EntityScriptRouter.post("/", authenticate, EntityScriptCrudController.create);
EntityScriptRouter.get("/", authenticate, EntityScriptCrudController.list);
EntityScriptRouter.get("/:id", authenticate, EntityScriptCrudController.getById);
EntityScriptRouter.put("/:id", authenticate, EntityScriptCrudController.update);

export default EntityScriptRouter;
