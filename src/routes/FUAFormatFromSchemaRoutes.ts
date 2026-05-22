import express from 'express';
import multer, { MulterError } from 'multer';


// Importing Controller
import FUAFormatFromSchemaController from '../controllers/FUAFormatFromSchemaController';
import { multerErrorHandler, upload } from '../middleware/multerMemory';
import { authenticate } from '../middleware/authentication';

// Creating router
const FUAFormatFromSchemaRouter = express.Router();

/**
 * @swagger
 * /ws/FUAFormat:
 *   post:
 *     summary: Crear formato FUA desde schema
 *     tags: [FUAFormat]
 *     security:
 *       - fuagentoken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               formatPayload:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Formato creado
 *   get:
 *     summary: Listar todos los formatos FUA
 *     tags: [FUAFormat]
 *     security:
 *       - fuagentoken: []
 *     responses:
 *       200:
 *         description: Lista de formatos
 */
let createUpload = upload.fields([{ name: 'formatPayload', maxCount: 1 }, { name: 'name', maxCount: 1 }]);
FUAFormatFromSchemaRouter.post('/', authenticate, multerErrorHandler(createUpload, "create - FUAFormatFromSchemaRoute"), FUAFormatFromSchemaController.create);
FUAFormatFromSchemaRouter.get('/', authenticate, FUAFormatFromSchemaController.listAll);

/**
 * @swagger
 * /ws/FUAFormat/{id}:
 *   get:
 *     summary: Obtener formato FUA por ID
 *     tags: [FUAFormat]
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
 *         description: Formato encontrado
 *       404:
 *         description: No encontrado
 *   put:
 *     summary: Editar formato FUA por ID
 *     tags: [FUAFormat]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               formatPayload:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Formato actualizado
 *   delete:
 *     summary: Eliminar formato FUA por ID
 *     tags: [FUAFormat]
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
 *         description: Formato eliminado
 */
FUAFormatFromSchemaRouter.get('/:id', authenticate, FUAFormatFromSchemaController.getById);
let edit = upload.fields([{ name: 'formatPayload', maxCount: 1 }, { name: 'name', maxCount: 1 }]);
FUAFormatFromSchemaRouter.put('/:id', authenticate, multerErrorHandler(edit, "edit - FUAFormatFromSchemaRoute"), FUAFormatFromSchemaController.edit);
FUAFormatFromSchemaRouter.delete('/:id', authenticate, FUAFormatFromSchemaController.delete);

/**
 * @swagger
 * /ws/FUAFormat/{id}/render:
 *   post:
 *     summary: Renderizar formato FUA por ID
 *     tags: [FUAFormat]
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
 *         description: HTML del formato renderizado
 */
FUAFormatFromSchemaRouter.post('/:id/render', authenticate, FUAFormatFromSchemaController.render);

/**
 * @swagger
 * /ws/FUAFormat/check-signature:
 *   post:
 *     summary: Verificar firma hash de un PDF de formato FUA
 *     tags: [FUAFormat]
 *     security:
 *       - fuagentoken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resultado de verificación de firma
 */
const uploadPdf = upload.fields([{ name: 'pdf', maxCount: 1 }]);
FUAFormatFromSchemaRouter.post('/check-signature', authenticate, uploadPdf, FUAFormatFromSchemaController.hashSignatureVerificationControllerTemporary);


export default FUAFormatFromSchemaRouter;