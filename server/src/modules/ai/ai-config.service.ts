import crypto from 'crypto';
import OpenAI from 'openai';
import { prisma } from '../../lib/prisma';
import { cache, CacheTTL } from '../../lib/redis';
import { AppError } from '../../middlewares/error.middleware';

export type AiProvider = 'system' | 'groq' | 'codex_router' | 'openai';
export type AiWireApi = 'chat_completions' | 'responses';

type ApiKeyState = {
  encrypted?: string;
  updatedAt?: string;
};

export type AiRuntimeConfig = {
  activeProvider: AiProvider;
  selectedModels: Record<Exclude<AiProvider, 'system'>, string>;
  keys: Partial<Record<Exclude<AiProvider, 'system'>, ApiKeyState>>;
};

export type AiRuntime = {
  provider: AiProvider;
  model: string;
  baseUrl?: string;
  wireApi: AiWireApi;
  apiKey?: string;
  source: 'admin' | 'env';
};

export const GROQ_FREE_MODELS = [
  'allam-2-7b',
  'canopylabs/orpheus-arabic-saudi',
  'canopylabs/orpheus-v1-english',
  'groq/compound',
  'groq/compound-mini',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-prompt-guard-2-22m',
  'meta-llama/llama-prompt-guard-2-86m',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b',
  'qwen/qwen3-32b',
  'whisper-large-v3',
  'whisper-large-v3-turbo',
] as const;

export const CODEX_ROUTER_MODELS = ['gpt-5.5'] as const;

const DB_KEY = 'ai_runtime_config';
const CACHE_KEY = 'ai:runtime_config';
const CACHE_TTL_SECS = CacheTTL.QUESTS;
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const CODEX_ROUTER_BASE_URL = 'https://luongchidung.online/v1';

const DEFAULT_CONFIG: AiRuntimeConfig = {
  activeProvider: 'system',
  selectedModels: {
    groq: DEFAULT_MODEL,
    codex_router: 'gpt-5.5',
    openai: process.env.AI_MODEL || DEFAULT_MODEL,
  },
  keys: {},
};

function mergeConfig(value: unknown): AiRuntimeConfig {
  const raw = (value || {}) as Partial<AiRuntimeConfig>;
  return {
    activeProvider: isProvider(raw.activeProvider) ? raw.activeProvider : DEFAULT_CONFIG.activeProvider,
    selectedModels: {
      ...DEFAULT_CONFIG.selectedModels,
      ...(raw.selectedModels || {}),
    },
    keys: raw.keys || {},
  };
}

function isProvider(value: unknown): value is AiProvider {
  return value === 'system' || value === 'groq' || value === 'codex_router' || value === 'openai';
}

function getEncryptionKey() {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY;
  if (!secret) {
    throw new AppError('AI_CONFIG_ENCRYPTION_KEY is required to save AI API keys', 503, 'AI_KEY_ENCRYPTION_NOT_CONFIGURED');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

function encryptApiKey(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
}

function decryptApiKey(value?: string) {
  if (!value) return undefined;
  const [ivB64, tagB64, encryptedB64] = value.split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new AppError('Stored AI API key is invalid', 500, 'AI_KEY_DECRYPT_FAILED');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function maskKey(key?: string, encrypted?: string) {
  if (!encrypted) return null;
  if (!key) return 'configured';
  if (key.length <= 10) return `${key.slice(0, 3)}...${key.slice(-2)}`;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function validateModel(provider: AiProvider, model?: string) {
  if (provider === 'system') return;
  if (!model) {
    throw new AppError('Model is required', 400, 'AI_MODEL_REQUIRED');
  }

  if (provider === 'groq' && !GROQ_FREE_MODELS.includes(model as typeof GROQ_FREE_MODELS[number])) {
    throw new AppError('Invalid Groq model', 400, 'INVALID_AI_MODEL');
  }
  if (provider === 'codex_router' && !CODEX_ROUTER_MODELS.includes(model as typeof CODEX_ROUTER_MODELS[number])) {
    throw new AppError('Invalid Codex router model', 400, 'INVALID_AI_MODEL');
  }
}

async function saveConfig(config: AiRuntimeConfig) {
  await prisma.systemConfig.upsert({
    where: { key: DB_KEY },
    update: { value: config },
    create: { key: DB_KEY, value: config },
  });
  await cache.del(CACHE_KEY);
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  return cache.getOrSet(
    CACHE_KEY,
    async () => {
      const row = await prisma.systemConfig.findUnique({ where: { key: DB_KEY } });
      if (!row?.value) return DEFAULT_CONFIG;
      return mergeConfig(row.value);
    },
    CACHE_TTL_SECS,
  );
}

export async function getAdminAiSettings() {
  const config = await getAiRuntimeConfig();
  const providers = {
    system: {
      label: 'System default',
      baseUrl: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : 'OpenAI default',
      wireApi: 'chat_completions' as AiWireApi,
      models: [process.env.AI_MODEL || DEFAULT_MODEL],
      apiKeyConfigured: Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY),
      maskedKey: null,
    },
    groq: {
      label: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      wireApi: 'chat_completions' as AiWireApi,
      models: GROQ_FREE_MODELS,
      apiKeyConfigured: Boolean(config.keys.groq?.encrypted),
      maskedKey: maskKey(undefined, config.keys.groq?.encrypted),
      keyUpdatedAt: config.keys.groq?.updatedAt,
    },
    codex_router: {
      label: 'Codex Router',
      baseUrl: CODEX_ROUTER_BASE_URL,
      wireApi: 'responses' as AiWireApi,
      models: CODEX_ROUTER_MODELS,
      apiKeyConfigured: Boolean(config.keys.codex_router?.encrypted),
      maskedKey: maskKey(undefined, config.keys.codex_router?.encrypted),
      keyUpdatedAt: config.keys.codex_router?.updatedAt,
    },
    openai: {
      label: 'OpenAI',
      baseUrl: 'OpenAI default',
      wireApi: 'chat_completions' as AiWireApi,
      models: [config.selectedModels.openai || DEFAULT_MODEL],
      apiKeyConfigured: Boolean(config.keys.openai?.encrypted),
      maskedKey: maskKey(undefined, config.keys.openai?.encrypted),
      keyUpdatedAt: config.keys.openai?.updatedAt,
    },
  };

  return {
    activeProvider: config.activeProvider,
    selectedModels: config.selectedModels,
    providers,
  };
}

export async function updateActiveAiProvider(provider: AiProvider, model?: string) {
  if (!isProvider(provider)) {
    throw new AppError('Invalid AI provider', 400, 'INVALID_AI_PROVIDER');
  }
  validateModel(provider, model);

  const config = await getAiRuntimeConfig();
  const next: AiRuntimeConfig = {
    ...config,
    activeProvider: provider,
    selectedModels: provider === 'system'
      ? config.selectedModels
      : { ...config.selectedModels, [provider]: model },
  };

  await saveConfig(next);
  return getAdminAiSettings();
}

export async function updateAiProviderKey(
  provider: Exclude<AiProvider, 'system'>,
  action: 'replace' | 'clear',
  apiKey?: string,
) {
  if (provider !== 'groq' && provider !== 'codex_router' && provider !== 'openai') {
    throw new AppError('Invalid AI provider', 400, 'INVALID_AI_PROVIDER');
  }

  const config = await getAiRuntimeConfig();
  const keys = { ...config.keys };

  if (action === 'clear') {
    delete keys[provider];
  } else {
    const trimmed = apiKey?.trim();
    if (!trimmed) {
      throw new AppError('API key is required', 400, 'AI_API_KEY_REQUIRED');
    }
    keys[provider] = {
      encrypted: encryptApiKey(trimmed),
      updatedAt: new Date().toISOString(),
    };
  }

  await saveConfig({ ...config, keys });
  return getAdminAiSettings();
}

export async function resolveAiRuntime(override?: {
  provider?: AiProvider;
  model?: string;
  apiKey?: string;
}): Promise<AiRuntime> {
  if (override?.provider && override.provider !== 'system' && override.model && override.apiKey?.trim()) {
    validateModel(override.provider, override.model);
    const apiKey = override.apiKey.trim();
    if (override.provider === 'groq') {
      return { provider: override.provider, model: override.model, baseUrl: 'https://api.groq.com/openai/v1', wireApi: 'chat_completions', apiKey, source: 'admin' };
    }
    if (override.provider === 'codex_router') {
      return { provider: override.provider, model: override.model, baseUrl: CODEX_ROUTER_BASE_URL, wireApi: 'responses', apiKey, source: 'admin' };
    }
    return { provider: override.provider, model: override.model, wireApi: 'chat_completions', apiKey, source: 'admin' };
  }

  const config = await getAiRuntimeConfig();
  const provider = override?.provider || config.activeProvider;

  if (provider === 'system') {
    return {
      provider,
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      baseUrl: process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined,
      wireApi: 'chat_completions',
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
      source: 'env',
    };
  }

  const model = override?.model || config.selectedModels[provider];
  validateModel(provider, model);

  const encrypted = config.keys[provider]?.encrypted;
  const apiKey = override?.apiKey?.trim() || decryptApiKey(encrypted);
  if (!apiKey) {
    throw new AppError(`AI API key is not configured for ${provider}`, 503, 'AI_API_KEY_NOT_CONFIGURED');
  }

  if (provider === 'groq') {
    return { provider, model, baseUrl: 'https://api.groq.com/openai/v1', wireApi: 'chat_completions', apiKey, source: 'admin' };
  }
  if (provider === 'codex_router') {
    return { provider, model, baseUrl: CODEX_ROUTER_BASE_URL, wireApi: 'responses', apiKey, source: 'admin' };
  }
  return { provider, model, wireApi: 'chat_completions', apiKey, source: 'admin' };
}

function normalizeResponsesContent(data: any) {
  if (typeof data?.output_text === 'string') return data.output_text;
  if (typeof data?.text === 'string') return data.text;

  const parts: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
      if (typeof content?.content === 'string') parts.push(content.content);
    }
  }
  return parts.join('\n').trim();
}

async function createResponsesCompletion(
  runtime: AiRuntime,
  payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  jsonMode = false,
) {
  const body = {
    model: runtime.model,
    input: payload.messages.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    })),
    temperature: payload.temperature,
    top_p: payload.top_p,
    max_output_tokens: payload.max_tokens,
    ...(jsonMode ? { text: { format: { type: 'json_object' } } } : {}),
  };

  const response = await fetch(`${runtime.baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${runtime.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    message?: string;
    [key: string]: unknown;
  };
  if (!response.ok) {
    const message = data?.error?.message || data?.message || '';
    const unsupportedJsonMode =
      jsonMode &&
      (message.toLowerCase().includes('text.format') ||
        message.toLowerCase().includes('json_object') ||
        message.toLowerCase().includes('unsupported'));

    if (unsupportedJsonMode) {
      return createResponsesCompletion(runtime, payload, false);
    }

    throw new AppError(data?.error?.message || data?.message || 'AI provider request failed', response.status, 'AI_PROVIDER_ERROR');
  }

  return {
    choices: [{
      message: {
        content: normalizeResponsesContent(data),
      },
    }],
  };
}

export async function createAiChatCompletion(
  payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options: { jsonMode?: boolean; runtimeOverride?: { provider?: AiProvider; model?: string; apiKey?: string } } = {},
) {
  const runtime = await resolveAiRuntime(options.runtimeOverride);
  const requestPayload = { ...payload, model: runtime.model };

  if (runtime.wireApi === 'responses') {
    return createResponsesCompletion(runtime, requestPayload, options.jsonMode);
  }

  const client = new OpenAI({ apiKey: runtime.apiKey, baseURL: runtime.baseUrl });
  if (!options.jsonMode) {
    return client.chat.completions.create(requestPayload);
  }

  try {
    return await client.chat.completions.create({
      ...requestPayload,
      response_format: { type: 'json_object' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    const unsupported = message.includes('response_format') || message.includes('json_object') || message.includes('json schema');
    if (!unsupported) throw error;
    return client.chat.completions.create(requestPayload);
  }
}

export async function testAiProvider(input: {
  provider: AiProvider;
  model?: string;
  apiKey?: string;
}) {
  const completion = await createAiChatCompletion(
    {
      model: input.model || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Reply with exactly: ok' },
        { role: 'user', content: 'test' },
      ],
      temperature: 0,
      max_tokens: 16,
    },
    { runtimeOverride: input },
  );

  const runtime = await resolveAiRuntime(input);
  return {
    provider: runtime.provider,
    model: runtime.model,
    baseUrl: runtime.baseUrl || 'default',
    wireApi: runtime.wireApi,
    response: completion.choices[0]?.message?.content || '',
  };
}
