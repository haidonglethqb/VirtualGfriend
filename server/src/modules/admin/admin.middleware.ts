import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface AdminConfig {
  username: string;
  passwordHash: string;
  jwtSecret: string;
}

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function getAdminConfig(): AdminConfig | null {
  const username = normalizeEnvValue(process.env.ADMIN_USERNAME);
  const passwordHash = normalizeEnvValue(process.env.ADMIN_PASSWORD_HASH);
  const jwtSecret = normalizeEnvValue(process.env.ADMIN_JWT_SECRET);

  if (!username || !passwordHash || !jwtSecret) {
    return null;
  }

  return { username, passwordHash, jwtSecret };
}

export interface AdminRequest extends Request {
  admin?: { username: string };
}

export function isAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

export function isAdminUsername(username: string): boolean {
  const config = getAdminConfig();
  if (!config) return false;
  return String(username || '').trim() === config.username;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const config = getAdminConfig();
  if (!config) return false;
  return bcrypt.compare(password, config.passwordHash);
}

export function generateAdminToken(username: string): string {
  const config = getAdminConfig();
  if (!config) {
    throw new Error('Admin authentication is not configured');
  }
  return jwt.sign({ username, isAdmin: true }, config.jwtSecret, { expiresIn: '24h' });
}

export function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  const config = getAdminConfig();
  if (!config) {
    return res.status(503).json({ error: 'Admin authentication is not configured' });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { username: string; isAdmin: boolean };
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = { username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
