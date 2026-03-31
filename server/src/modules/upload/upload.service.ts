import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://sgp1.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'sgp1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET || 'haichu';
const CDN_BASE = `https://${BUCKET}.${(process.env.DO_SPACES_REGION || 'sgp1')}.digitaloceanspaces.com`;

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

export const uploadService = {
  validateFile(file: Express.Multer.File): string | null {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return 'Only PNG, JPEG, and WebP images are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be under 5MB';
    }
    return null;
  },

  async uploadAvatar(file: Express.Multer.File, gender: string): Promise<string> {
    const ext = path.extname(file.originalname) || '.png';
    const safeName = sanitizeFilename(path.basename(file.originalname, ext));
    const timestamp = Date.now();
    const key = `AI_Template/${gender}/${safeName}-${timestamp}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }));

    return `${CDN_BASE}/${key}`;
  },

  async deleteByUrl(url: string): Promise<void> {
    if (!url.startsWith(CDN_BASE)) return;
    const key = url.replace(`${CDN_BASE}/`, '');
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (err) {
      console.error('Failed to delete from DO Spaces:', err);
    }
  },
};
