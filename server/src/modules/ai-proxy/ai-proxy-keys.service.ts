import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { cache, CacheTTL } from '../../lib/redis';

const DB_KEY = 'ai_proxy_keys';
const CACHE_KEY = 'ai:proxy_keys';
const CACHE_TTL_SECS = CacheTTL.QUESTS; // ~5 minutes

export type ProxyApiKey = {
  id: string;
  label: string;
  keyHash: string;       // SHA-256 hash — never expose raw key after creation
  keyPrefix: string;     // First 8 chars for display (e.g. "vgf_abc1")
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  targetProvider?: string; // If set, this key always routes to this provider; otherwise uses global active
};

type ProxyKeysConfig = {
  keys: ProxyApiKey[];
};

const DEFAULT_CONFIG: ProxyKeysConfig = { keys: [] };

async function loadConfig(): Promise<ProxyKeysConfig> {
  return cache.getOrSet(
    CACHE_KEY,
    async () => {
      const row = await prisma.systemConfig.findUnique({ where: { key: DB_KEY } });
      if (!row?.value) return DEFAULT_CONFIG;
      const raw = row.value as any;
      return { keys: Array.isArray(raw?.keys) ? raw.keys : [] };
    },
    CACHE_TTL_SECS,
  );
}

async function saveConfig(config: ProxyKeysConfig) {
  await prisma.systemConfig.upsert({
    where: { key: DB_KEY },
    update: { value: config },
    create: { key: DB_KEY, value: config },
  });
  await cache.del(CACHE_KEY);
}

/** Generate a new proxy API key. Returns the raw key ONCE — only hash is stored. */
export async function generateProxyApiKey(label: string): Promise<{ key: ProxyApiKey; rawKey: string }> {
  const config = await loadConfig();

  // Format: vgf_<32 random hex chars>
  const rawKey = `vgf_${crypto.randomBytes(16).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 8);

  const newKey: ProxyApiKey = {
    id: `pk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    label: label.trim(),
    keyHash,
    keyPrefix,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  const keys = [...config.keys, newKey];
  await saveConfig({ keys });

  return { key: newKey, rawKey };
}

/** List all proxy keys (without hashes). */
export async function listProxyApiKeys(): Promise<Omit<ProxyApiKey, 'keyHash'>[]> {
  const config = await loadConfig();
  return config.keys.map(({ keyHash: _hash, ...rest }) => rest);
}

/** Update a proxy key properties (label, targetProvider). */
export async function updateProxyApiKey(
  id: string,
  updates: { label?: string; targetProvider?: string | null },
): Promise<Omit<ProxyApiKey, 'keyHash'>[]> {
  const config = await loadConfig();
  const index = config.keys.findIndex((k) => k.id === id);
  if (index === -1) throw new Error('Proxy API key not found');

  if (updates.label !== undefined) {
    config.keys[index].label = updates.label.trim();
  }
  if (updates.targetProvider !== undefined) {
    config.keys[index].targetProvider = updates.targetProvider || undefined;
  }

  await saveConfig(config);
  return listProxyApiKeys();
}

/** Toggle active/inactive. */
export async function toggleProxyApiKey(id: string, isActive: boolean): Promise<Omit<ProxyApiKey, 'keyHash'>[]> {
  const config = await loadConfig();
  const index = config.keys.findIndex((k) => k.id === id);
  if (index === -1) throw new Error('Proxy API key not found');

  config.keys[index] = { ...config.keys[index], isActive };
  await saveConfig(config);
  return listProxyApiKeys();
}

/** Delete a proxy key. */
export async function deleteProxyApiKey(id: string): Promise<Omit<ProxyApiKey, 'keyHash'>[]> {
  const config = await loadConfig();
  const filtered = config.keys.filter((k) => k.id !== id);
  await saveConfig({ keys: filtered });
  return listProxyApiKeys();
}

/**
 * Verify an incoming raw key against stored hashes.
 * Returns the key info (without hash) if valid and active, or null if not.
 * Also updates lastUsedAt asynchronously (fire-and-forget).
 */
export async function verifyProxyApiKey(rawKey: string): Promise<Omit<ProxyApiKey, 'keyHash'> | null> {
  const config = await loadConfig();
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const found = config.keys.find((k) => k.isActive && k.keyHash === hash);
  if (!found) return null;

  // Update lastUsedAt asynchronously (don't block the request)
  const updated = config.keys.map((k) =>
    k.id === found.id ? { ...k, lastUsedAt: new Date().toISOString() } : k,
  );
  saveConfig({ keys: updated }).catch(() => {
    // Silently fail — lastUsedAt is non-critical
  });

  const { keyHash: _hash, ...rest } = found;
  return rest;
}


