import express from 'express';

import FUAFromVisitPDFController from '../controllers/FUAFromVisitPDFController';
import { authenticate } from '../middleware/authentication';

const FUAFromVisitPDFRouter = express.Router();

/**
 * @swagger
 * /ws/FUAFromVisitPDF:
 *   get:
 *     summary: Listar todos los PDFs de FUA generados
 *     tags: [FUAFromVisitPDF]
 *     security:
 *       - fuagentoken: []
 *     responses:
 *       200:
 *         description: Lista de PDFs
 */
FUAFromVisitPDFRouter.get('/', authenticate, FUAFromVisitPDFController.listAll);

/**
 * @swagger
 * /ws/FUAFromVisitPDF/{id}/getPDF:
 *   get:
 *     summary: Descargar PDF de un FUA por ID
 *     tags: [FUAFromVisitPDF]
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
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: PDF no encontrado
 */
FUAFromVisitPDFRouter.get('/:id/getPDF', authenticate, FUAFromVisitPDFController.getPDF);


export default FUAFromVisitPDFRouter;