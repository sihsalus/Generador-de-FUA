import express from 'express';

// Importing Controller
import FUAFromVisitController from '../controllers/FUAFromVisitController';
import { upload } from '../middleware/multerMemory';
import { authenticate } from '../middleware/authentication';

// Creating router
const FUAFromVisitRouter = express.Router();

/**
 * @swagger
 * /ws/FUAFromVisit:
 *   post:
 *     summary: Crear FUA a partir de una visita
 *     tags: [FUAFromVisit]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: FUA creado
 *   get:
 *     summary: Listar todos los FUA
 *     tags: [FUAFromVisit]
 *     security:
 *       - fuagentoken: []
 *     responses:
 *       200:
 *         description: Lista de FUAs
 */
FUAFromVisitRouter.post('/', FUAFromVisitController.create);
FUAFromVisitRouter.get('/', authenticate, FUAFromVisitController.listAll);

/**
 * @swagger
 * /ws/FUAFromVisit/{id}:
 *   get:
 *     summary: Obtener FUA por ID
 *     tags: [FUAFromVisit]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FUA encontrado
 *       404:
 *         description: No encontrado
 */
FUAFromVisitRouter.get('/:id', FUAFromVisitController.getById);

/**
 * @swagger
 * /ws/FUAFromVisit/{id}/addFUAinQueueFromDatabase:
 *   get:
 *     summary: Agregar FUA a la cola desde la base de datos
 *     tags: [FUAFromVisit]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FUA agregado a la cola
 */
FUAFromVisitRouter.get('/:id/addFUAinQueueFromDatabase', FUAFromVisitController.addFUAinQueueFromDatabase);

/**
 * @swagger
 * /ws/FUAFromVisit/{id}/render:
 *   post:
 *     summary: Renderizar FUA por ID
 *     tags: [FUAFromVisit]
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
 *         description: HTML del FUA renderizado
 */
FUAFromVisitRouter.post('/:id/render', authenticate, FUAFromVisitController.render);

/**
 * @swagger
 * /ws/FUAFromVisit/hashSignatureVerification:
 *   post:
 *     summary: Verificar firma hash de un PDF
 *     tags: [FUAFromVisit]
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
 *         description: Resultado de verificación
 */
const uploadPdf = upload.fields([{ name: 'pdf', maxCount: 1 }]);
FUAFromVisitRouter.post('/hashSignatureVerification', authenticate, uploadPdf, FUAFromVisitController.hashSignatureVerification);

/**
 * @swagger
 * /ws/FUAFromVisit/{id}/generatePDF:
 *   post:
 *     summary: Generar PDF firmado de un FUA
 *     tags: [FUAFromVisit]
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
 *         description: PDF generado y firmado
 */
FUAFromVisitRouter.post('/:id/generatePDF', authenticate, FUAFromVisitController.generateSignedPdf);

/**
 * @swagger
 * /ws/FUAFromVisit/addFUAinQueue:
 *   post:
 *     summary: Agregar FUA a la cola de procesamiento
 *     tags: [FUAFromVisit]
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
 *         description: FUA agregado a la cola
 */
FUAFromVisitRouter.post('/addFUAinQueue', authenticate, FUAFromVisitController.addFUAinQueue);

/**
 * @swagger
 * /ws/FUAFromVisit/removeFUAFromQueue:
 *   post:
 *     summary: Remover FUA de la cola de procesamiento
 *     tags: [FUAFromVisit]
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
 *         description: FUA removido de la cola
 */
FUAFromVisitRouter.post('/removeFUAFromQueue', authenticate, FUAFromVisitController.removeFUAFromQueue);




export default FUAFromVisitRouter;