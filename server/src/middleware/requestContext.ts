import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'];
  const normalizedRequestId =
    typeof requestId === 'string' && requestId.trim() ? requestId.trim() : crypto.randomUUID();

  req.requestId = normalizedRequestId;
  res.setHeader('X-Request-Id', normalizedRequestId);

  next();
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        type: 'request',
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
      })
    );
  });

  next();
};

