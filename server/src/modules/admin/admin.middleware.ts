import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      'ADMIN_PASSWORD_HASH environment variable is required but not set. ' +
      'Generate a hash with: node -e "require(\'bcryptjs\').hash(\'your-password\', 12).then(console.log)"'
    );
  }
  return hash;
}

function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET environment variable is required but not set.');
  }
  return secret;
}

export interface AdminRequest extends Request {
  admin?: { username: string };
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, getAdminPasswordHash());
}

export function generateAdminToken(username: string): string {
  return jwt.sign({ username, isAdmin: true }, getAdminJwtSecret(), { expiresIn: '24h' });
}

export function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as { username: string; isAdmin: boolean };
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = { username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}
