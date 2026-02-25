import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors/ApiError';
import { isProduction } from '../config/env';

const buildErrorPayload = (
  req: Request,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) => {
  const error: Record<string, unknown> = {
    code,
    message,
    requestId: req.requestId,
  };

  if (details !== undefined && !isProduction) {
    error.details = details;
  }

  return {
    error,
    // temporary compatibility for existing clients that read top-level message
    message,
  };
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, 'NOT_FOUND', `Маршрут не найден: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  void next;

  if (err instanceof ApiError) {
    res.status(err.statusCode).json(buildErrorPayload(req, err.statusCode, err.code, err.message, err.details));
    return;
  }

  const errRecord = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : undefined;
  const errMessage = typeof errRecord?.message === 'string' ? errRecord.message : undefined;
  const errCode = typeof errRecord?.code === 'string' ? errRecord.code : undefined;
  const errStack = typeof errRecord?.stack === 'string' ? errRecord.stack : undefined;

  if (errCode === 'LIMIT_FILE_SIZE') {
    res
      .status(413)
      .json(buildErrorPayload(req, 413, 'FILE_TOO_LARGE', 'Размер файла превышает допустимый лимит'));
    return;
  }

  if (
    typeof errMessage === 'string' &&
    errMessage.includes('Разрешены только CSV файлы')
  ) {
    res
      .status(400)
      .json(buildErrorPayload(req, 400, 'INVALID_FILE_TYPE', 'Разрешены только CSV файлы'));
    return;
  }

  console.error('Unhandled server error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    error: errStack || err,
  });

  res.status(500).json(
    buildErrorPayload(
      req,
      500,
      'INTERNAL_SERVER_ERROR',
      'Внутренняя ошибка сервера',
      errStack
    )
  );
};
