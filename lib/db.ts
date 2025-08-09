import Database from "better-sqlite3"
import fs from "node:fs"
import path from "node:path"
import bcrypt from "bcryptjs"

export type Analysis = {
  id: number
  createdAt: string
  method: string
  url: string
  raw: string
  summary: string
  aiJson: any
  model: string
}

export type Settings = {
  id: number
  xai_api_key: string | null
  openai_api_key: string | null
  session_secret: string | null
  provider: "xai" | "openai"
  model: string | null
}

export type User = {
  id: number
  username: string
  password_hash: string
}

let db: Database.Database | null = null

function getDb() {
  if (db) return db
  const dataDir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const dbPath = path.join(dataDir, "app.db")
  db = new Database(dbPath)
  init(db)
  return db!
}

function hasColumn(d: Database.Database, table: string, name: string) {
  const rows = d.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some((r) => r.name === name)
}

function init(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      xai_api_key TEXT,
      session_secret TEXT
    );
    INSERT OR IGNORE INTO settings (id, xai_api_key, session_secret) VALUES (1, NULL, NULL);

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      raw TEXT NOT NULL,
      summary TEXT,
      aiJson TEXT,
      model TEXT
    );
  `)

  // Migrations: add new columns if missing
  if (!hasColumn(d, "settings", "openai_api_key")) {
    d.exec(`ALTER TABLE settings ADD COLUMN openai_api_key TEXT`)
  }
  if (!hasColumn(d, "settings", "provider")) {
    d.exec(`ALTER TABLE settings ADD COLUMN provider TEXT DEFAULT 'xai'`)
  }
  if (!hasColumn(d, "settings", "model")) {
    d.exec(`ALTER TABLE settings ADD COLUMN model TEXT`)
  }

  // Ensure default admin user
  const row = d.prepare("SELECT id FROM users WHERE username = ?").get("admin")
  if (!row) {
    const defaultHash = bcrypt.hashSync("admin123!", 10)
    d.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run("admin", defaultHash)
  }
}

export async function setAdminPasswordHash(hash: string) {
  const d = getDb()
  d.prepare("UPDATE users SET password_hash = ? WHERE username = ?").run(hash, "admin")
}

export async function getUser(username: string): Promise<User | null> {
  const d = getDb()
  const row = d.prepare("SELECT id, username, password_hash FROM users WHERE username = ?").get(username)
  return row || null
}

export async function getSettings(): Promise<Settings> {
  const d = getDb()
  const row = d
    .prepare(
      "SELECT id, xai_api_key, openai_api_key, session_secret, COALESCE(provider, 'xai') as provider, model FROM settings WHERE id = 1"
    )
    .get()
  return row
}

export async function updateSettings(data: Partial<Settings>) {
  const d = getDb()
  const current = await getSettings()
  const xai = data.xai_api_key === undefined ? current.xai_api_key : data.xai_api_key
  const openai = data.openai_api_key === undefined ? current.openai_api_key : data.openai_api_key
  const sec = data.session_secret === undefined ? current.session_secret : data.session_secret
  const provider = (data.provider ?? current.provider) || "xai"
  const model = data.model === undefined ? current.model : data.model
  d.prepare("UPDATE settings SET xai_api_key = ?, openai_api_key = ?, session_secret = ?, provider = ?, model = ? WHERE id = 1")
    .run(xai, openai, sec, provider, model)
}

export async function saveAnalysis(entry: Omit<Analysis, "id">): Promise<Analysis> {
  const d = getDb()
  const res = d
    .prepare(
      "INSERT INTO analyses (createdAt, method, url, raw, summary, aiJson, model) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(entry.createdAt, entry.method, entry.url, entry.raw, entry.summary, JSON.stringify(entry.aiJson), entry.model)
  const id = Number(res.lastInsertRowid)
  return { id, ...entry }
}

export async function getRecentAnalyses(limit = 20): Promise<Analysis[]> {
  const d = getDb()
  const rows = d
    .prepare("SELECT id, createdAt, method, url, raw, summary, aiJson, model FROM analyses ORDER BY id DESC LIMIT ?")
    .all(limit)
    .map((r: any) => ({ ...r, aiJson: r.aiJson ? JSON.parse(r.aiJson) : null }))
  return rows
}

export async function getAnalysisById(id: number): Promise<Analysis | null> {
  const d = getDb()
  const r = d.prepare("SELECT id, createdAt, method, url, raw, summary, aiJson, model FROM analyses WHERE id = ?").get(id)
  if (!r) return null
  return { ...r, aiJson: r.aiJson ? JSON.parse(r.aiJson) : null }
}

export async function deleteAnalysis(id: number): Promise<boolean> {
  const d = getDb()
  const res = d.prepare("DELETE FROM analyses WHERE id = ?").run(id)
  return Number(res.changes) > 0
}
