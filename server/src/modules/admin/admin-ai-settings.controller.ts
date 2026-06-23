import { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AdminRequest } from './admin.middleware';
import {
  AiProvider,
  clearAiDebugLog,
  getAiDebugLog,
  getAdminAiSettings,
  testAiProvider,
  updateActiveAiProvider,
  updateAiContextLimits,
  updateAiProviderKey,
  addCustomProvider,
  updateCustomProvider,
  deleteCustomProvider,
} from '../ai/ai-config.service';
import { AppError } from '../../middlewares/error.middleware';

const providers = ['system', 'groq', 'codex_router', 'openai'] as const;
const keyProviders = ['groq', 'codex_router', 'openai'] as const;

const providerSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1).max(100).optional(),
}).strict();

const keySchema = z.object({
  action: z.enum(['replace', 'clear']),
  apiKey: z.string().min(1).max(500).optional(),
}).strict();

const testSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).max(500).optional(),
}).strict();

const contextLimitsSchema = z.object({
  messageLimit: z.number().int().min(1).max(1000).optional(),
  factLimit: z.number().int().min(1).max(500).optional(),
  summaryLimit: z.number().int().min(1).max(50).optional(),
}).strict();

export async function getAiSettings(_req: AdminRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getAdminAiSettings() });
  } catch (error) {
    next(error);
  }
}

export async function getAiDebugSettings(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isFinite(rawLimit) ? rawLimit : undefined;
    res.json({ success: true, data: await getAiDebugLog(limit) });
  } catch (error) {
    next(error);
  }
}

export async function clearAiDebugSettings(_req: AdminRequest, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await clearAiDebugLog(), message: 'AI debug log cleared' });
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
    if (!keyProviders.includes(provider as typeof keyProviders[number]) && !provider.startsWith('custom_')) {
      throw new AppError('Invalid AI key provider', 400, 'INVALID_AI_PROVIDER');
    }

    const parsed = keySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid AI key payload', 400, 'VALIDATION_ERROR');
    }

    const data = await updateAiProviderKey(
      provider,
      parsed.data.action,
      parsed.data.apiKey,
    );
    res.json({ success: true, data, message: parsed.data.action === 'clear' ? 'AI key cleared' : 'AI key updated' });
  } catch (error) {
    next(error);
  }
}

export async function updateAiSettingsContext(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const parsed = contextLimitsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid AI context payload', 400, 'VALIDATION_ERROR');
    }

    const data = await updateAiContextLimits(parsed.data);
    res.json({ success: true, data, message: 'AI context limits updated' });
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

const customProviderSchema = z.object({
  label: z.string().min(1).max(100),
  baseUrl: z.string().min(1).max(300).refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'Base URL must start with http:// or https://',
  }),
  modelId: z.string().min(1).max(100),
  apiKey: z.string().min(1).max(500),
}).strict();

const updateCustomProviderSchema = z.object({
  label: z.string().min(1).max(100),
  baseUrl: z.string().min(1).max(300).refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'Base URL must start with http:// or https://',
  }),
  modelId: z.string().min(1).max(100),
  apiKey: z.string().min(1).max(500).optional(),
}).strict();

export async function createCustomProviderHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const parsed = customProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid custom provider payload', 400, 'VALIDATION_ERROR');
    }

    const data = await addCustomProvider(parsed.data);
    res.json({ success: true, data, message: 'Custom AI provider added' });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomProviderHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!id || !id.startsWith('custom_')) {
      throw new AppError('Invalid custom provider ID', 400, 'INVALID_PROVIDER_ID');
    }

    const parsed = updateCustomProviderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message || 'Invalid custom provider payload', 400, 'VALIDATION_ERROR');
    }

    const data = await updateCustomProvider(id, parsed.data);
    res.json({ success: true, data, message: 'Custom AI provider updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomProviderHandler(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!id || !id.startsWith('custom_')) {
      throw new AppError('Invalid custom provider ID', 400, 'INVALID_PROVIDER_ID');
    }

    const data = await deleteCustomProvider(id);
    res.json({ success: true, data, message: 'Custom AI provider deleted' });
  } catch (error) {
    next(error);
  }
}
