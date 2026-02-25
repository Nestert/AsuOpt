import { z } from 'zod';

const numericIdString = z.string().regex(/^\d+$/, 'Должен быть числовой идентификатор');
const optionalNumericIdString = z
  .union([numericIdString, z.undefined()])
  .optional()
  .transform((value) => value ?? undefined);

export const idParamSchema = z.object({
  id: numericIdString,
});

export const projectIdQuerySchema = z
  .object({
    projectId: optionalNumericIdString,
  })
  .passthrough();

export const authRegisterBodySchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(255),
  })
  .passthrough();

export const authLoginBodySchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(255),
  })
  .passthrough();

export const projectCreateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    code: z.string().trim().min(1).max(50),
    description: z.string().max(5000).optional().nullable(),
    templateId: z.union([numericIdString, z.number().int().positive()]).optional(),
    settings: z.unknown().optional(),
  })
  .passthrough();

export const projectUpdateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    status: z.enum(['active', 'archived', 'template']).optional(),
    settings: z.unknown().optional().nullable(),
  })
  .passthrough();

export const projectDeleteQuerySchema = z
  .object({
    force: z.enum(['true', 'false']).optional(),
  })
  .passthrough();

export const projectListQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z.enum(['updatedAt', 'createdAt', 'name', 'code', 'status']).optional(),
    order: z
      .enum(['asc', 'desc', 'ASC', 'DESC'])
      .transform((value) => value.toUpperCase() as 'ASC' | 'DESC')
      .optional(),
    q: z.string().trim().min(1).max(255).optional(),
  })
  .passthrough();

export const signalListQuerySchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    filterByProject: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z.enum(['type', 'name', 'createdAt', 'updatedAt', 'totalCount']).optional(),
    order: z
      .enum(['asc', 'desc', 'ASC', 'DESC'])
      .transform((value) => value.toUpperCase() as 'ASC' | 'DESC')
      .optional(),
    q: z.string().trim().min(1).max(255).optional(),
    type: z.enum(['AI', 'AO', 'DI', 'DO']).optional(),
  })
  .passthrough();

export const deviceReferenceListQuerySchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z
      .enum(['posDesignation', 'deviceType', 'description', 'systemCode', 'createdAt', 'updatedAt'])
      .optional(),
    order: z
      .enum(['asc', 'desc', 'ASC', 'DESC'])
      .transform((value) => value.toUpperCase() as 'ASC' | 'DESC')
      .optional(),
    q: z.string().trim().min(1).max(255).optional(),
  })
  .passthrough();

export const deviceReferenceTreeQuerySchema = z
  .object({
    projectId: z.coerce.number().int().positive().optional(),
    q: z.string().trim().min(1).max(255).optional(),
    deviceType: z.string().trim().min(1).max(255).optional(),
    maxNodes: z.coerce.number().int().positive().max(5000).optional(),
  })
  .passthrough();

export const databaseTableNameParamSchema = z.object({
  tableName: z.enum([
    'signals',
    'device_signals',
    'device_type_signals',
    'devices',
    'device_references',
    'kips',
    'zras',
    'signal_categories',
    'projects',
    'users',
  ]),
});

export const importTempBodySchema = z
  .object({
    fileName: z.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
    type: z.enum(['kip', 'zra']),
  })
  .passthrough();

export const importCsvBodySchema = z
  .object({
    tempFileName: z.string().trim().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/).optional(),
    columnMap: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  })
  .passthrough();

export const importAssignSignalsParamsSchema = z.object({
  deviceType: z.string().trim().min(1).max(255),
});
