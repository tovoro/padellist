import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'

export type Database = DatabaseSync

export function openDatabase(path: string, migrationsDir: string): Database {
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  // WAL: Leser blockieren den Schreiber nicht, und ein Absturz mitten im
  // Schreiben hinterlaesst eine konsistente Datei.
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 5000')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db, migrationsDir)
  return db
}

/** Alles oder nichts. node:sqlite ist synchron, deshalb genuegt BEGIN/COMMIT. */
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (cause) {
    db.exec('ROLLBACK')
    throw cause
  }
}

/** node:sqlite liefert nur Record<string, SQLOutputValue>; hier bekommt das Ergebnis seinen Zeilentyp. */
export function queryAll<T>(db: Database, sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[]
}

export function queryOne<T>(db: Database, sql: string, ...params: SQLInputValue[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined
}

function migrate(db: Database, dir: string): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`)
  adoptD1Migrations(db)

  const applied = new Set(queryAll<{ name: string }>(db, 'SELECT name FROM schema_migrations').map((row) => row.name))
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(dir, file), 'utf8')
    transaction(db, () => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file)
    })
    console.log(`migration applied: ${file}`)
  }
}

// Bruecke fuer die aus Cloudflare D1 exportierte Datenbank: deren Buchhaltung
// fuehrt dieselben Dateinamen, also gelten sie als angewendet und die Tabelle
// verschwindet. Kann weg, sobald der Umzug Geschichte ist.
function adoptD1Migrations(db: Database): void {
  const legacy = queryOne(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'")
  if (!legacy) return

  transaction(db, () => {
    db.exec('INSERT OR IGNORE INTO schema_migrations (name, applied_at) SELECT name, applied_at FROM d1_migrations')
    db.exec('DROP TABLE d1_migrations')
  })
  console.log('migration history adopted from d1_migrations')
}
