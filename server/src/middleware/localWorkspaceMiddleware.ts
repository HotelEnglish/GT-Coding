import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      workspaceId?: string;
    }
  }
}

/**
 * Temporary single-user boundary for the functional MVP. It is deliberately
 * not authentication and must be replaced by project authorization before any
 * public or multi-user deployment.
 */
export function localWorkspaceMiddleware(req: Request, _res: Response, next: NextFunction) {
  const supplied = req.header('x-gt-workspace');
  const workspaceId = supplied && /^[a-zA-Z0-9_-]{1,64}$/.test(supplied)
    ? supplied
    : 'local-default';
  req.workspaceId = workspaceId;
  next();
}
