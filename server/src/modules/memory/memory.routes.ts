import { Router } from 'express';
import { memoryController } from './memory.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const memoryRouter = Router();

memoryRouter.use(authenticate);

memoryRouter.get('/', memoryController.getMemories);
memoryRouter.get('/milestones', memoryController.getMilestones);
memoryRouter.post('/', memoryController.createMemory);
memoryRouter.patch('/:memoryId/favorite', memoryController.toggleFavorite);
memoryRouter.delete('/:memoryId', memoryController.deleteMemory);
