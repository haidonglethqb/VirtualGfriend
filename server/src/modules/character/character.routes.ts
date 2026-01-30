import { Router } from 'express';
import { characterController } from './character.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const characterRouter = Router();

characterRouter.use(authenticate);

characterRouter.get('/', characterController.getMyCharacter);
characterRouter.get('/me', characterController.getMyCharacter);
characterRouter.post('/', characterController.createCharacter);
characterRouter.patch('/', characterController.updateCharacter);
characterRouter.patch('/update', characterController.updateCharacter);
characterRouter.patch('/customize', characterController.customizeCharacter);
characterRouter.get('/facts', characterController.getFacts);
characterRouter.post('/facts', characterController.addFact);
characterRouter.get('/relationship', characterController.getRelationshipStatus);
