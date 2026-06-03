import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AdminRequest } from './admin.middleware';
import {
  AiProvider,
  getAdminAiSettings,
  testAiProvider,
  updateActiveAiProvider,
  updateAiProviderKey,
} from '../ai/ai-config.service';
import { AppError } from '../../middlewares/error.middleware';

const providers = ['system', 'groq', 'codex_router', 'openai'] as const;
const keyProviders = ['groq', 'codex_router', 'openai'] as const;

const providerSchema = z.object({
  provider: z.enum(providers),
  model: z.string().min(1).max(100).optional(),
}).strict();

const keySchema = z.object({
  action: z.enum(['replace', 'clear']),
  apiKey: z.string().min(1).max(500).optional(),
}).strict();

const testSchema = z.object({
  provider: z.enum(providers),
  model: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).max(500).optional(),
}).strict();

export async function getAiSettings(_req: AdminRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getAdminAiSettings() });
  } catch (error) {
    next(error);
  }
}

export async function updateAiSettingsProvider(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid AI provider payload', 400, 'VALIDATION_ERROR');
    }

    const data = await updateActiveAiProvider(parsed.data.provider as AiProvider, parsed.data.model);
    res.json({ success: true, data, message: 'AI provider updated' });
  } catch (error) {
    next(error);
  }
}

export async function updateAiSettingsKey(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const provider = req.params.provider;
    if (!keyProviders.includes(provider as typeof keyProviders[number])) {
      throw new AppError('Invalid AI key provider', 400, 'INVALID_AI_PROVIDER');
    }

    const parsed = keySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid AI key payload', 400, 'VALIDATION_ERROR');
    }

    const data = await updateAiProviderKey(
      provider as typeof keyProviders[number],
      parsed.data.action,
      parsed.data.apiKey,
    );
    res.json({ success: true, data, message: parsed.data.action === 'clear' ? 'AI key cleared' : 'AI key updated' });
  } catch (error) {
    next(error);
  }
}

export async function testAiSettings(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const parsed = testSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid AI test payload', 400, 'VALIDATION_ERROR');
    }

    const data = await testAiProvider(parsed.data);
    res.json({ success: true, data, message: 'AI provider test succeeded' });
  } catch (error) {
    next(error);
  }
}
