type NodeEnv = 'development' | 'test' | 'production';

const rawNodeEnv = process.env.NODE_ENV ?? 'development';

export const NODE_ENV: NodeEnv = (
  rawNodeEnv === 'production' || rawNodeEnv === 'test' ? rawNodeEnv : 'development'
);

export const isProduction = NODE_ENV === 'production';
export const isTest = NODE_ENV === 'test';

const parsedPort = Number(process.env.PORT ?? 3001);
export const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 3001;

let cachedJwtSecret: string | null = null;

export const getJwtSecret = (): string => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret) {
    cachedJwtSecret = envSecret;
    return cachedJwtSecret;
  }

  if (isProduction) {
    throw new Error('JWT_SECRET is required in production');
  }

  cachedJwtSecret = 'dev-only-insecure-jwt-secret';
  return cachedJwtSecret;
};

export const assertRequiredEnv = (): void => {
  void getJwtSecret();
};
