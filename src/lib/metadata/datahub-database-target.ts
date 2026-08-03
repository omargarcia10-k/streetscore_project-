export type DatabaseTarget = "local" | "shared" | "branch";

export type ResolvedDataHubDatabaseConfig = {
  target: DatabaseTarget;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslMode: string;
};

type ConnectionParts = {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
};

type EnvSource = Record<string, string | undefined>;

function normalizeTarget(value: string | undefined): DatabaseTarget {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "shared" || normalized === "branch") {
    return normalized;
  }

  return "local";
}

function parsePostgresConnectionString(connectionString: string): ConnectionParts {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//u, "").trim();

  if (!url.hostname || !database || !url.username) {
    throw new Error("PostgreSQL connection string is missing host, database, or username.");
  }

  return {
    host: url.hostname,
    port: url.port || "5432",
    database,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

function resolveFromParts(prefix: string, env: EnvSource): ConnectionParts | null {
  const host = env[`${prefix}_HOST`]?.trim();
  const port = env[`${prefix}_PORT`]?.trim() || "5432";
  const database = env[`${prefix}_DATABASE`]?.trim();
  const username = env[`${prefix}_USERNAME`]?.trim();
  const password = env[`${prefix}_PASSWORD`] ?? "";

  if (!host || !database || !username) {
    return null;
  }

  return {
    host,
    port,
    database,
    username,
    password,
  };
}

function resolveLocalConnection(env: EnvSource): ConnectionParts {
  const fromParts = resolveFromParts("LOCAL_POSTGRES", env);

  if (fromParts) {
    return fromParts;
  }

  const connectionString = env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for the local database target.");
  }

  return parsePostgresConnectionString(connectionString);
}

function resolveSharedConnection(env: EnvSource): ConnectionParts {
  const fromParts = resolveFromParts("NEON_SHARED", env);

  if (fromParts) {
    return fromParts;
  }

  const connectionString = env.NEON_SHARED_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("NEON_SHARED_DATABASE_URL is not configured for the shared database target.");
  }

  return parsePostgresConnectionString(connectionString);
}

function resolveBranchConnection(env: EnvSource): ConnectionParts {
  const fromParts = resolveFromParts("NEON_BRANCH", env);

  if (fromParts) {
    return fromParts;
  }

  const connectionString = env.NEON_BRANCH_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("NEON_BRANCH_DATABASE_URL is not configured for the branch database target.");
  }

  return parsePostgresConnectionString(connectionString);
}

export function resolveDataHubDatabaseTarget(env: EnvSource = process.env): ResolvedDataHubDatabaseConfig {
  const target = normalizeTarget(env.DATABASE_TARGET ?? env.USE_DATABASE);
  const sslModeOverride = env.POSTGRES_SSLMODE?.trim();

  const connection =
    target === "shared"
      ? resolveSharedConnection(env)
      : target === "branch"
        ? resolveBranchConnection(env)
        : resolveLocalConnection(env);

  return {
    target,
    ...connection,
    sslMode: sslModeOverride || (target === "local" ? "disable" : "require"),
  };
}

export function buildDataHubIngestionEnv(env: EnvSource = process.env): Record<string, string> {
  const resolved = resolveDataHubDatabaseTarget(env);

  return {
    DATABASE_TARGET: resolved.target,
    POSTGRES_HOST: resolved.host,
    POSTGRES_PORT: resolved.port,
    POSTGRES_DATABASE: resolved.database,
    POSTGRES_USERNAME: resolved.username,
    POSTGRES_PASSWORD: resolved.password,
    POSTGRES_SSLMODE: resolved.sslMode,
  };
}
