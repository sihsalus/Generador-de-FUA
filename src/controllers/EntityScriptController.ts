import { Request, Response } from 'express';
import EntityScriptService from '../services/EntityScriptService';

const EntityScriptController = {

  async create(req: Request, res: Response): Promise<void> {
    const scriptContent: string | undefined = req.file
      ? req.file.buffer.toString('utf-8')
      : req.body.scriptContent;

    try {
      const result = await EntityScriptService.create({ ...req.body, scriptContent });
      res.status(201).json(result);
    } catch (err: any) {
      const isConflict = err.name === 'SequelizeUniqueConstraintError';
      res.status(isConflict ? 409 : 500).json({
        error: 'Failed to create EntityScript.',
        message: err.message,
        details: err.details ?? null,
      });
    }
  },

  async listAll(req: Request, res: Response): Promise<void> {
    const targetEntity = req.query.targetEntity as string | undefined;
    try {
      const result = await EntityScriptService.listAll(targetEntity);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to list EntityScripts.',
        message: err.message,
        details: err.details ?? null,
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    try {
      const result = await EntityScriptService.getByIdOrUUID(id);
      if (!result) {
        res.status(404).json({ error: `EntityScript '${id}' not found.` });
        return;
      }
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to get EntityScript.',
        message: err.message,
        details: err.details ?? null,
      });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    const scriptContent: string | undefined = req.file
      ? req.file.buffer.toString('utf-8')
      : req.body.scriptContent;

    try {
      const result = await EntityScriptService.update({ ...req.body, uuid: id, scriptContent });
      if (!result) {
        res.status(404).json({ error: `EntityScript '${id}' not found.` });
        return;
      }
      res.status(200).json(result);
    } catch (err: any) {
      const isConflict = err.name === 'SequelizeUniqueConstraintError';
      res.status(isConflict ? 409 : 500).json({
        error: 'Failed to update EntityScript.',
        message: err.message,
        details: err.details ?? null,
      });
    }
  },

  async softDelete(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id);
    try {
      const result = await EntityScriptService.softDelete({ ...req.body, uuid: id });
      if (!result) {
        res.status(404).json({ error: `EntityScript '${id}' not found.` });
        return;
      }
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to delete EntityScript.',
        message: err.message,
        details: err.details ?? null,
      });
    }
  },

};

export default EntityScriptController;
