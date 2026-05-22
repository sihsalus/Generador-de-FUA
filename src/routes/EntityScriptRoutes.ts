import express from 'express';
import EntityScriptExecutionController from '../controllers/EntityScriptExecutionController';
import EntityScriptCrudController from '../controllers/EntityScriptCrudController';
import { authenticate } from '../middleware/authentication';
import { multerErrorHandler, upload } from '../middleware/multerMemory';

const EntityScriptRouter = express.Router();

/**
 * @swagger
 * /ws/entity-script/execute:
 *   post:
 *     summary: Ejecutar script ad-hoc
 *     tags: [EntityScript]
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
 *         description: Resultado de ejecución
 *       401:
 *         description: No autorizado
 */
EntityScriptRouter.post(
  "/upload",
  authenticate,
  multerErrorHandler(upload.single("scriptFile"), "/ws/entity-script/upload"),
  EntityScriptCrudController.createFromFile
);

EntityScriptRouter.post("/execute", authenticate, EntityScriptExecutionController.executeAdHoc);

/**
 * @swagger
 * /ws/entity-script/execute/{id}:
 *   post:
 *     summary: Ejecutar script almacenado por ID
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Resultado de ejecución
 *       404:
 *         description: Script no encontrado
 */
EntityScriptRouter.post("/execute/:id", authenticate, EntityScriptExecutionController.executeStored);

/**
 * @swagger
 * /ws/entity-script:
 *   post:
 *     summary: Crear un nuevo EntityScript
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Script creado
 *   get:
 *     summary: Listar scripts (filtrar por ?targetEntity=X)
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: query
 *         name: targetEntity
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de scripts
 */
EntityScriptRouter.post("/", authenticate, EntityScriptCrudController.create);
EntityScriptRouter.get("/", authenticate, EntityScriptCrudController.list);

/**
 * @swagger
 * /ws/entity-script/{id}:
 *   get:
 *     summary: Obtener script por ID
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Script encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Actualizar script por ID
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Script actualizado
 *   delete:
 *     summary: Eliminar (soft delete) script por ID
 *     tags: [EntityScript]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Script eliminado
 */
EntityScriptRouter.get("/:id", authenticate, EntityScriptCrudController.getById);
EntityScriptRouter.put("/:id", authenticate, EntityScriptCrudController.update);
EntityScriptRouter.delete("/:id", authenticate, EntityScriptCrudController.softDelete);

export default EntityScriptRouter;
