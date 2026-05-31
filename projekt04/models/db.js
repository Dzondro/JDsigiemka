import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath =
  process.env.DB_PATH?.trim()
    ? path.resolve(process.env.DB_PATH.trim())
    : path.join(__dirname, "..", "data", "blog.sqlite");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

function createUniquePostTitleIndex() {
  const duplicateTitles = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
        SELECT author_id, LOWER(title) AS title, COUNT(*) AS count
        FROM posts
        GROUP BY author_id, LOWER(title)
        HAVING COUNT(*) > 1
      );`,
    )
    .get()?.c;

  if ((duplicateTitles ?? 0) === 0) {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_author_title ON posts(author_id, title COLLATE NOCASE);");
  } else {
    console.warn(
      "Nie utworzono unikalnego indeksu na postach, ponieważ istnieją duplikaty tytułów dla tego samego autora.",
    );
  }
}

export function initDb() {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users);").all();
  const hasIsAdmin = userColumns.some((col) => col?.name === "is_admin");
  if (!hasIsAdmin) {
    db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);");

  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      edited_at TEXT,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const postColumns = db.prepare("PRAGMA table_info(posts);").all();
  const hasEditedAt = postColumns.some((col) => col?.name === "edited_at");
  if (!hasEditedAt) {
    db.exec("ALTER TABLE posts ADD COLUMN edited_at TEXT;");
  }

  createUniquePostTitleIndex();
}

export default {
  db,
  initDb,
};
