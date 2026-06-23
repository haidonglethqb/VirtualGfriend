import { Router } from 'express';
import {
  aiProxyAuthMiddleware,
  chatCompletionsHandler,
  listModelsHandler,
  responsesHandler,
} from './ai-proxy.controller';

export const aiProxyRouter = Router();

// All routes require the proxy API key in Authorization header
aiProxyRouter.use(aiProxyAuthMiddleware);

// GET /v1/models — list all available models
aiProxyRouter.get('/models', listModelsHandler);

// POST /v1/chat/completions — OpenAI-compatible chat completions
aiProxyRouter.post('/chat/completions', chatCompletionsHandler);

// POST /v1/responses — Custom Responses API completions (compatibility with Codex Router)
aiProxyRouter.post('/responses', responsesHandler);
