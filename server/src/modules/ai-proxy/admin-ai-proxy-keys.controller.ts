import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AdminRequest } from '../admin/admin.middleware';
import {
  generateProxyApiKey,
  listProxyApiKeys,
  updateProxyApiKey,
  toggleProxyApiKey,
  deleteProxyApiKey,
} from './ai-proxy-keys.service';
import { AppError } from '../../middlewares/error.middleware';

const generateSchema = z.object({
  label: z.string().min(1).max(100),
}).strict();

const updateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  targetProvider: z.string().nullable().optional(),
}).strict();

const toggleSchema = z.object({
  isActive: z.boolean(),
}).strict();

/** GET /admin/ai-proxy-keys — list all keys */
export async function listProxyKeysHandler(_req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const keys = await listProxyApiKeys();
    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
}

/** POST /admin/ai-proxy-keys — generate a new key */
export async function generateProxyKeyHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid payload', 400, 'VALIDATION_ERROR');
    }

    const { key, rawKey } = await generateProxyApiKey(parsed.data.label);

    // Return the raw key ONCE — it will never be retrievable again
    res.json({
      success: true,
      data: {
        key: { ...key, keyHash: undefined },
        rawKey, // ← show only on creation
      },
      message: 'API key generated. Save the raw key now — it will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
}

/** PATCH /admin/ai-proxy-keys/:id — update key properties */
export async function updateProxyKeyHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid payload', 400, 'VALIDATION_ERROR');
    }

    const keys = await updateProxyApiKey(id, {
      label: parsed.data.label,
      targetProvider: parsed.data.targetProvider,
    });
    res.json({ success: true, data: keys, message: 'API key updated' });
  } catch (error) {
    next(error);
  }
}

/** PATCH /admin/ai-proxy-keys/:id/toggle — enable or disable */
export async function toggleProxyKeyHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid payload', 400, 'VALIDATION_ERROR');
    }

    const keys = await toggleProxyApiKey(id, parsed.data.isActive);
    res.json({ success: true, data: keys, message: `API key ${parsed.data.isActive ? 'enabled' : 'disabled'}` });
  } catch (error) {
    next(error);
  }
}

/** DELETE /admin/ai-proxy-keys/:id — delete permanently */
export async function deleteProxyKeyHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const keys = await deleteProxyApiKey(id);
    res.json({ success: true, data: keys, message: 'API key deleted' });
  } catch (error) {
    next(error);
  }
}
