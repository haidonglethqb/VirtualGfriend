import { Router, Request, Response } from 'express';
import multer from 'multer';
import { adminAuth } from '../admin/admin.middleware';
import { uploadService } from './upload.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// POST /api/admin/upload — upload avatar image to DO Spaces
router.post('/', adminAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const validationError = uploadService.validateFile(file);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const gender = (req.body.gender || 'female').toLowerCase();
    const validGenders = ['female', 'male', 'lgbt'];
    const folder = validGenders.includes(gender) ? gender : 'female';

    const url = await uploadService.uploadAvatar(file, folder);
    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export { router as uploadRouter };
