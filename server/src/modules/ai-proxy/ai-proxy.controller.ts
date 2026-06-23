import { Request, Response, NextFunction } from 'express';
import { createAiChatCompletion, getAdminAiSettings, resolveAiRuntime } from '../ai/ai-config.service';
import { verifyProxyApiKey } from './ai-proxy-keys.service';
import { AppError } from '../../middlewares/error.middleware';
import { createModuleLogger } from '../../lib/logger';

const log = createModuleLogger('AiProxy');

/**
 * Middleware: Verify the Bearer token against DB-stored proxy API keys.
 * Falls back to AI_PROXY_API_KEY env var for backward compatibility.
 *
 * The token ONLY authenticates with this server — it is never forwarded
 * to the underlying AI provider. The server always uses its own configured keys.
 */
export async function aiProxyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <API_KEY>',
        type: 'invalid_request_error',
        code: 'missing_api_key',
      },
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  // Check DB-stored keys first
  const valid = await verifyProxyApiKey(token).catch(() => false);
  if (valid) {
    return next();
  }

  // Fallback: single env var (backward compat / initial setup)
  const envKey = process.env.AI_PROXY_API_KEY;
  if (envKey && token === envKey) {
    return next();
  }

  res.status(401).json({
    error: {
      message: 'Invalid API key.',
      type: 'invalid_request_error',
      code: 'invalid_api_key',
    },
  });
}


/**
 * GET /v1/models
 * Returns all available models across all configured providers,
 * in OpenAI-compatible format.
 */
export async function listModelsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getAdminAiSettings();
    const now = Math.floor(Date.now() / 1000);

    const models: object[] = [];
    for (const [providerId, info] of Object.entries(settings.providers)) {
      for (const model of info.models) {
        models.push({
          id: model,
          object: 'model',
          created: now,
          owned_by: providerId,
        });
      }
    }

    res.json({ object: 'list', data: models });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /v1/chat/completions
 * OpenAI-compatible chat completions endpoint.
 * The server uses its own AI provider key (from DB/env) — the caller's Bearer token
 * is only used for authentication with this proxy.
 */
export async function chatCompletionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as {
      model?: string;
      messages?: unknown[];
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      stream?: boolean;
      response_format?: { type: string };
    };

    // Validate required fields
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new AppError('messages is required and must be a non-empty array', 400, 'INVALID_REQUEST');
    }

    // Streaming is not supported (underlying service doesn't stream)
    if (body.stream === true) {
      throw new AppError('Streaming is not supported by this proxy', 400, 'STREAMING_NOT_SUPPORTED');
    }

    const jsonMode = body.response_format?.type === 'json_object';

    // Resolve the runtime to find out which model will actually be used
    // (we let the server pick its own provider/model from config)
    const runtime = await resolveAiRuntime();

    // Build the payload — use the runtime model (server's configured model),
    // not whatever model the caller requested. This is intentional: the server
    // decides which model to use based on its own admin settings.
    const requestedModel = body.model;
    if (requestedModel) {
      log.info(`Proxy request for model "${requestedModel}", serving with "${runtime.model}" via ${runtime.provider}`);
    }

    const payload = {
      model: runtime.model,
      messages: body.messages as any,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1024,
      top_p: typeof body.top_p === 'number' ? body.top_p : undefined,
    };

    const completion = await createAiChatCompletion(payload, { jsonMode });

    // Return OpenAI-compatible response
    res.json({
      id: `chatcmpl-proxy-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: runtime.model,
      choices: completion.choices.map((choice: any, index: number) => ({
        index,
        message: {
          role: 'assistant',
          content: choice.message?.content ?? '',
        },
        finish_reason: 'stop',
      })),
      usage: {
        prompt_tokens: -1,    // Not tracked
        completion_tokens: -1,
        total_tokens: -1,
      },
    });
  } catch (error) {
    // Return OpenAI-style error format
    if (error instanceof AppError) {
      res.status(error.statusCode ?? 500).json({
        error: {
          message: error.message,
          type: 'api_error',
          code: error.code ?? 'internal_error',
        },
      });
      return;
    }
    next(error);
  }
}
