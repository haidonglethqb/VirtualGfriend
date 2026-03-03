import { Router } from 'express';
import { characterController } from './character.controller';
import { templateController } from './template.controller';
import { factsController } from './facts.controller';
import { relationshipController } from './relationship.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const characterRouter = Router();

// Templates (public - no auth needed for browsing)
characterRouter.get('/templates', templateController.getTemplates);

characterRouter.use(authenticate);

// Primary routes
characterRouter.get('/', characterController.getMyCharacter);
characterRouter.post('/', characterController.createCharacter);
characterRouter.patch('/', characterController.updateCharacter);

// Aliases for backward compatibility - prefer using primary routes above
characterRouter.get('/me', characterController.getMyCharacter); // Alias for GET /
characterRouter.patch('/update', characterController.updateCharacter); // Alias for PATCH /

// Other routes
characterRouter.patch('/customize', characterController.customizeCharacter);
characterRouter.get('/facts', factsController.getFacts);
characterRouter.post('/facts', factsController.addFact);
characterRouter.patch('/facts/:factId', factsController.updateFact);
characterRouter.delete('/facts/:factId', factsController.deleteFact);
characterRouter.get('/relationship', characterController.getRelationshipStatus);

// Relationship management routes
characterRouter.get('/relationship/status', relationshipController.getStatus);
characterRouter.get('/relationship/history', relationshipController.getHistory);
characterRouter.post('/relationship/end', relationshipController.endRelationship);
characterRouter.post('/relationship/reconcile/:characterId', relationshipController.reconcile);
characterRouter.get('/relationship/can-start-new', relationshipController.canStartNew);
