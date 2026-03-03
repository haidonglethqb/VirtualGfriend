import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2a$12$RXJp5BUPK1drH8oUvfVB7OILtO3Wj2Lx8QSmm4TmMGbcpNBMJ9qKq';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-super-secret-key-change-in-production';

export interface AdminRequest extends Request {
  admin?: { username: string };
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export function generateAdminToken(username: string): string {
  return jwt.sign({ username, isAdmin: true }, ADMIN_JWT_SECRET, { expiresIn: '24h' });
}

export function adminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { username: string; isAdmin: boolean };
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = { username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
}

export async function initAdminPassword() {
  const hash = await bcrypt.hash('H@ichu321', 12);
  console.log('Admin password hash:', hash);
}
