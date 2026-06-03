import { CharacterFact } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const VIETNAM_TZ = 'Asia/Ho_Chi_Minh';
const NOISY_KEYS = new Set([
  'ngay_gap',
  'gio_gap',
  'so_chi_em',
  'so_anh_em',
  'khong_thich_n',
  'khong_thich_an',
]);
const NOISY_VALUES = new Set(['mai', 'hom nay', 'toi nay', 'ok', 'u', 'uh']);
const DURABLE_CATEGORIES = new Set(['personal', 'preference', 'relationship', 'work', 'life']);

function toSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function toVietnamDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
}

function vietnamDateAt(hour: number, minute = 0, offsetDays = 0) {
  const { year, month, day } = toVietnamDateParts();
  return new Date(Date.UTC(year, month - 1, day + offsetDays, hour - 7, minute, 0, 0));
}

export function inferEventExpiry(value: string, key = ''): Date | null {
  const text = toSearchText(`${key} ${value}`);
  const hourMatch = text.match(/(?:^|\D)([01]?\d|2[0-3])\s*(?:h|gio|:)\s*(\d{1,2})?/);
  const hour = hourMatch ? Number(hourMatch[1]) : 23;
  const minute = hourMatch?.[2] ? Number(hourMatch[2]) : 59;

  if (text.includes('mai') || text.includes('ngay mai')) {
    return vietnamDateAt(hour, minute, 1);
  }
  if (text.includes('hom nay') || text.includes('toi nay') || text.includes('chieu nay')) {
    return vietnamDateAt(hour, minute, 0);
  }
  if (text.includes('tuan nay') || text.includes('cuoi tuan')) {
    return vietnamDateAt(23, 59, 7);
  }

  return null;
}

export function extractSchedulingEventFact(message: string) {
  const text = toSearchText(message);
  const hasRelativeDate = /(mai|ngay mai|hom nay|toi nay|chieu nay|tuan nay|cuoi tuan)/.test(text);
  const hasTime = /(?:^|\D)([01]?\d|2[0-3])\s*(?:h|gio|:)\s*(\d{1,2})?/.test(text);
  const hasVisitIntent = /(ghe|qua|toi|den|choi|gap|hen)/.test(text);

  if (!hasRelativeDate || !hasTime || !hasVisitIntent) return null;

  return {
    key: text.includes('nha') ? 'hen_gap_nha' : 'hen_gap',
    value: message.trim(),
    category: 'event',
    importance: 6,
  };
}

export function normalizeIncomingMemoryFact(fact: {
  key: string;
  value: string;
  category?: string;
  importance?: number;
}) {
  const key = fact.key.trim();
  const value = fact.value.trim();
  const category = fact.category || 'other';
  const searchValue = toSearchText(value);
  const expiresAt = category === 'event' ? inferEventExpiry(value, key) : null;
  const isNoisy =
    value.length < 2 ||
    NOISY_KEYS.has(key) ||
    (/^\d+\s*(h|gio)?$/i.test(searchValue) && category === 'event') ||
    NOISY_VALUES.has(searchValue);

  if (isNoisy) return null;

  return {
    ...fact,
    key,
    value,
    category,
    factType: category === 'event' ? 'temporal' : DURABLE_CATEGORIES.has(category) ? 'permanent' : 'evolving',
    expiresAt,
    metadata: expiresAt ? { timezone: VIETNAM_TZ, inferredFrom: value } : undefined,
  };
}

export function getPromptFacts(facts: CharacterFact[], limit?: number) {
  const now = new Date();
  const promptFactLimit = Math.min(Math.max(limit || 200, 1), 500);
  return facts
    .filter((fact) => !fact.expiresAt || fact.expiresAt > now)
    .filter((fact) => !(fact.sourceType.startsWith('ai_') && isNoisyStoredFact(fact)))
    .slice(0, promptFactLimit);
}

export function formatFactForPrompt(fact: CharacterFact) {
  if (fact.category === 'event') {
    return `- [temporary event] ${fact.value}`;
  }
  return `- ${fact.key}: ${fact.value}`;
}

export async function cleanupLowQualityAiFacts(characterId?: string) {
  const now = new Date();
  const where = {
    ...(characterId ? { characterId } : {}),
    sourceType: { in: ['ai_inline', 'ai_batch'] },
    OR: [
      { expiresAt: { lt: now } },
      { key: { in: [...NOISY_KEYS] } },
      { value: { in: ['mai', 'hom nay', 'toi nay', 'ok', 'u', 'uh'] } },
    ],
  };

  return prisma.characterFact.deleteMany({ where });
}

function isNoisyStoredFact(fact: CharacterFact) {
  const value = toSearchText(fact.value.trim());
  return NOISY_KEYS.has(fact.key) || value.length < 2 || NOISY_VALUES.has(value);
}
