import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ApiError } from '../errors/ApiError';

type RequestPart = 'body' | 'params' | 'query';

const validate =
  (part: RequestPart, schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const requestPartContainer = req as unknown as Record<RequestPart, unknown>;
    const parsed = schema.safeParse(requestPartContainer[part]);

    if (!parsed.success) {
      next(
        new ApiError(400, 'VALIDATION_ERROR', 'Некорректные параметры запроса', {
          part,
          issues: parsed.error.issues,
        })
      );
      return;
    }

    (requestPartContainer[part] as unknown) = parsed.data;
    next();
  };

export const validateBody = (schema: ZodTypeAny) => validate('body', schema);
export const validateParams = (schema: ZodTypeAny) => validate('params', schema);
export const validateQuery = (schema: ZodTypeAny) => validate('query', schema);
