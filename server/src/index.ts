import { markOrphanedRunsFailed } from './services/analysisRunService';
import app from './app';

const PORT = process.env.PORT || 3001;

markOrphanedRunsFailed().catch((error) => {
  console.error('Failed to reconcile orphaned analysis runs:', error);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
