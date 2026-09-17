export interface Config {
  port: number
  dbPath: string
  migrationsDir: string
  staticDir: string
  appPassword: string
  sessionSecret: string
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

/** Pfade sind relativ zum Arbeitsverzeichnis: Projektwurzel im Dev, /app im Container. */
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const port = Number(env.PORT ?? 8080)
  if (!Number.isInteger(port) || port <= 0) throw new Error(`PORT is not a valid port: ${env.PORT}`)

  return {
    port,
    dbPath: env.DB_PATH ?? 'data/padellist.db',
    migrationsDir: env.MIGRATIONS_DIR ?? 'migrations',
    staticDir: env.STATIC_DIR ?? 'dist',
    appPassword: required(env, 'APP_PASSWORD'),
    sessionSecret: required(env, 'SESSION_SECRET'),
  }
}
