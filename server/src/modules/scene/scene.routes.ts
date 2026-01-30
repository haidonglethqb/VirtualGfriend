import { Router } from 'express';
import { sceneController } from './scene.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const sceneRouter = Router();

sceneRouter.use(authenticate);

sceneRouter.get('/', sceneController.getScenes);
sceneRouter.get('/unlocked', sceneController.getUnlockedScenes);
sceneRouter.post('/unlock/:sceneId', sceneController.unlockScene);
sceneRouter.post('/set-active/:sceneId', sceneController.setActiveScene);
