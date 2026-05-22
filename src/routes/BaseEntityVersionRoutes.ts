import express from 'express';


// Importing Controller
import { authenticate } from '../middleware/authentication';
import BaseEntityVersionController from '../controllers/BaseEntityVersionController';

// Creating router
const BaseEntityVersionRouter = express.Router();

/**
 * @swagger
 * /ws/BaseEntityVersion:
 *   get:
 *     summary: Obtener versiones de una entidad por ID o UUID
 *     tags: [BaseEntityVersion]
 *     security:
 *       - fuagentoken: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: ID numérico de la entidad
 *       - in: query
 *         name: uuid
 *         schema:
 *           type: string
 *         description: UUID de la entidad
 *     responses:
 *       200:
 *         description: Lista de versiones encontradas
 *       404:
 *         description: Entidad no encontrada
 */
BaseEntityVersionRouter.get('/', authenticate, BaseEntityVersionController.getVersionsByIdOrUUID);

// TODO: Implement Pagination
// Read Base Enitity Versions
/* BaseEntityVersionRouter.get(
    '/', 
    authenticate,
    BaseEntityVersionController.listAll
); */

export default BaseEntityVersionRouter;