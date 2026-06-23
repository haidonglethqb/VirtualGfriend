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

  // Check DB-stored keys first — also stores key info for downstream handlers
  const keyInfo = await verifyProxyApiKey(token).catch(() => null);
  if (keyInfo) {
    res.locals.proxyKey = keyInfo; // { id, label, targetProvider?, ... }
    return next();
  }

  // Fallback: single env var (backward compat / initial setup)
  const envKey = process.env.AI_PROXY_API_KEY;
  if (envKey && token === envKey) {
    res.locals.proxyKey = null; // env key has no per-key config
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

    const isStream = body.stream === true;
    const jsonMode = body.response_format?.type === 'json_object';

    // Read the target provider from the verified key (if any)
    // If the key has a targetProvider set, route to that provider.
    // Otherwise fall back to the global active provider.
    const proxyKey = res.locals.proxyKey as { targetProvider?: string } | null;
    const targetProvider = proxyKey?.targetProvider || undefined;

    // Resolve runtime — pass targetProvider as override if set
    const runtime = await resolveAiRuntime(targetProvider ? { provider: targetProvider } : undefined);

    const requestedModel = body.model;
    if (requestedModel) {
      log.info(`Proxy request for model "${requestedModel}", serving with "${runtime.model}" via ${runtime.provider}${
        targetProvider ? ` (key-specific target: ${targetProvider})` : ' (global active)'
      } [stream=${isStream}]`);
    }

    const payload = {
      model: runtime.model,
      messages: body.messages as any,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
      max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 1024,
      top_p: typeof body.top_p === 'number' ? body.top_p : undefined,
    };

    const completion = await createAiChatCompletion(payload, { jsonMode });
    const content = completion.choices[0]?.message?.content ?? '';

    if (isStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunkId = `chatcmpl-proxy-${Date.now()}`;

      const chunk1 = {
        id: chunkId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: runtime.model,
        choices: [
          {
            index: 0,
            delta: { content },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk1)}\n\n`);

      const chunk2 = {
        id: chunkId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: runtime.model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk2)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Return OpenAI-compatible response (non-stream)
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

/**
 * POST /v1/responses
 * Custom Responses API endpoint (for compatibility with Codex Router / responses wire format).
 */
export async function responsesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as {
      model?: string;
      instructions?: string;
      input?: { role?: string; content?: string }[];
      temperature?: number;
      max_output_tokens?: number;
      top_p?: number;
      response_format?: any;
    };

    // Determine target provider from key
    const proxyKey = res.locals.proxyKey as { targetProvider?: string } | null;
    const targetProvider = proxyKey?.targetProvider || undefined;

    // Resolve runtime
    const runtime = await resolveAiRuntime(targetProvider ? { provider: targetProvider } : undefined);

    log.info(`Proxy responses request, serving with "${runtime.model}" via ${runtime.provider}${
      targetProvider ? ` (key-specific target: ${targetProvider})` : ' (global active)'
    }`);

    if (runtime.wireApi === 'responses') {
      // Direct forward to the responses API upstream
      const payload = {
        model: runtime.model,
        instructions: body.instructions,
        input: body.input,
        temperature: body.temperature,
        top_p: body.top_p,
        max_output_tokens: body.max_output_tokens,
        response_format: body.response_format,
      };

      const upstreamRes = await fetch(`${runtime.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${runtime.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
      });

      const data = await upstreamRes.json().catch(() => ({})) as Record<string, unknown>;
      if (!upstreamRes.ok) {
        throw new AppError(
          (data?.error as any)?.message || data?.message || 'Upstream responses request failed',
          upstreamRes.status,
          'AI_PROVIDER_ERROR',
        );
      }
      res.json(data);
      return;
    }

    // Translate responses format to chat completions format
    const messages: any[] = [];
    if (body.instructions) {
      messages.push({ role: 'system', content: body.instructions });
    }
    if (Array.isArray(body.input)) {
      for (const msg of body.input) {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || '',
        });
      }
    } else {
      messages.push({ role: 'user', content: 'Continue.' });
    }

    const payload = {
      model: runtime.model,
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.8,
      max_tokens: typeof body.max_output_tokens === 'number' ? body.max_output_tokens : 1024,
      top_p: typeof body.top_p === 'number' ? body.top_p : undefined,
    };

    const completion = await createAiChatCompletion(payload);
    const content = completion.choices[0]?.message?.content ?? '';

    // Return in responses API format
    res.json({
      output_text: content,
      text: content,
      output: [
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        },
      ],
    });
  } catch (error) {
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
