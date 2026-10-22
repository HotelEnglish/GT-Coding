import { Router } from 'express';
import { localWorkspaceMiddleware } from '../middleware/localWorkspaceMiddleware';
import { createDocument, createProject, getAnalysisRun, listProjects, startAnalysisRun } from '../controllers/workbenchController';

const router = Router();

router.use(localWorkspaceMiddleware);
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.post('/projects/:projectId/documents', createDocument);
router.post('/projects/:projectId/analysis-runs', startAnalysisRun);
router.get('/analysis-runs/:id', getAnalysisRun);

export default router;
