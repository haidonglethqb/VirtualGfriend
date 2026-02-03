import { Router } from 'express';
import { characterController } from './character.controller';
import { factsController } from './facts.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const characterRouter = Router();

characterRouter.use(authenticate);

characterRouter.get('/', characterController.getMyCharacter);
characterRouter.get('/me', characterController.getMyCharacter);
characterRouter.post('/', characterController.createCharacter);
characterRouter.patch('/', characterController.updateCharacter);
characterRouter.patch('/update', characterController.updateCharacter);
characterRouter.patch('/customize', characterController.customizeCharacter);
characterRouter.get('/facts', factsController.getFacts);
characterRouter.post('/facts', factsController.addFact);
characterRouter.patch('/facts/:factId', factsController.updateFact);
characterRouter.delete('/facts/:factId', factsController.deleteFact);
characterRouter.get('/relationship', characterController.getRelationshipStatus);
