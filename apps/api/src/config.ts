const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

export const config = {
  env: (process.env["NODE_ENV"] ?? "development") as "development" | "production" | "test",
  port: Number(process.env["API_PORT"] ?? 3001),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  jwt: {
    secret: required("JWT_SECRET"),
    accessTtl: Number(process.env["JWT_ACCESS_TTL"] ?? 900),
    refreshTtl: Number(process.env["JWT_REFRESH_TTL"] ?? 2592000),
  },
  aiServiceUrl: process.env["AI_SERVICE_URL"] ?? "http://localhost:8000",
  aiServiceSecret: process.env["AI_SERVICE_SECRET"] ?? "",
  ses: {
    fromAddress: process.env["SES_FROM_ADDRESS"] ?? "noreply@cotask.io",
  },
} as const;
