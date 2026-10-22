import { Router } from 'express';
import { localWorkspaceMiddleware } from '../middleware/localWorkspaceMiddleware';
import {
  createDocument,
  createMemo,
  createProject,
  decideCodeAssignment,
  decideMemo,
  getAnalysisRun,
  getProjectOverview,
  listProjectDocuments,
  listProjects,
  putSaturationAssessment,
  startAnalysisRunHandler,
} from '../controllers/workbenchController';

const router = Router();

router.use(localWorkspaceMiddleware);
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.post('/projects/:projectId/documents', createDocument);
router.get('/projects/:projectId/documents', listProjectDocuments);
router.get('/projects/:projectId/overview', getProjectOverview);
router.post('/projects/:projectId/analysis-runs', startAnalysisRunHandler);
router.put('/projects/:projectId/saturation-assessment', putSaturationAssessment);
router.get('/analysis-runs/:id', getAnalysisRun);
router.post('/code-assignments/:id/decisions', decideCodeAssignment);
router.post('/memos', createMemo);
router.post('/memos/:id/decisions', decideMemo);

export default router;
