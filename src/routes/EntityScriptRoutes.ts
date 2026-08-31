import express from 'express';
import { authenticate } from '../middleware/authentication';
import { upload, multerErrorHandler } from '../middleware/multerMemory';
import EntityScriptController from '../controllers/EntityScriptController';

const EntityScriptRouter = express.Router();

EntityScriptRouter.post(
  '/',
  authenticate,
  multerErrorHandler(upload.single('scriptFile'), 'EntityScriptRoutes - POST /'),
  EntityScriptController.create
);
EntityScriptRouter.get('/', authenticate, EntityScriptController.listAll);
EntityScriptRouter.get('/:id', authenticate, EntityScriptController.getById);
EntityScriptRouter.put(
  '/:id',
  authenticate,
  multerErrorHandler(upload.single('scriptFile'), 'EntityScriptRoutes - PUT /:id'),
  EntityScriptController.update
);
EntityScriptRouter.delete('/:id', authenticate, EntityScriptController.softDelete);

export default EntityScriptRouter;
