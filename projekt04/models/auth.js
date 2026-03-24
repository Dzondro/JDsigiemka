import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha256";
const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 50;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 72;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  const value = String(email || "");
  if (!value) return false;
  if (value.length > MAX_EMAIL_LEN) return false;
  if (/\s/.test(value)) return false;

  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (domain.length > 253) return false;
  return true;
}

function passwordLooksOk(password) {
  const value = String(password || "");
  if (value.length < MIN_PASSWORD_LEN) return false;
  if (value.length > MAX_PASSWORD_LEN) return false;
  if (!/[\p{L}]/u.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  return true;
}

function hashPassword(password, saltHex, iterations) {
  const derived = crypto.pbkdf2Sync(
    String(password),
    Buffer.from(saltHex, "hex"),
    iterations,
    PASSWORD_KEYLEN,
    PASSWORD_DIGEST,
  );
  return derived.toString("hex");
}

function constantTimeEqualHex(aHex, bHex) {
  const a = Buffer.from(String(aHex), "hex");
  const b = Buffer.from(String(bHex), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function ensureAdminUser() {
  const defaultEmail = "admin@localhost";
  const defaultPassword = "admin123";
  const defaultFirstName = "Admin";
  const defaultLastName = "User";
  const defaultAge = 30;

  const email = normalizeEmail(process.env.ADMIN_EMAIL || defaultEmail);
  const password = String(process.env.ADMIN_PASSWORD || defaultPassword);
  const firstName = String(process.env.ADMIN_FIRST_NAME || defaultFirstName).trim();
  const lastName = String(process.env.ADMIN_LAST_NAME || defaultLastName).trim();
  const ageRaw = process.env.ADMIN_AGE;
  const age = ageRaw == null ? defaultAge : Number(ageRaw);

  if (!isValidEmail(email)) {
    return { ok: false, error: "ADMIN_EMAIL jest nieprawidłowy." };
  }
  if (!firstName || !lastName) {
    return { ok: false, error: "ADMIN_FIRST_NAME / ADMIN_LAST_NAME są nieprawidłowe." };
  }
  if (!Number.isFinite(age) || age < 18 || age > 150) {
    return { ok: false, error: "ADMIN_AGE jest nieprawidłowy." };
  }
  if (!passwordLooksOk(password)) {
    return {
      ok: false,
      error: `ADMIN_PASSWORD musi mieć ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} znaków i zawierać literę oraz cyfrę.`,
    };
  }

  const existing = db
    .prepare("SELECT id, is_admin AS isAdmin FROM users WHERE email = ?")
    .get(email);

  if (existing) {
    if (!existing.isAdmin) {
      db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(existing.id);
    }
    return { ok: true, created: false, email };
  }

  const saltHex = crypto.randomBytes(16).toString("hex");
  const hashHex = hashPassword(password, saltHex, PASSWORD_ITERATIONS);

  const result = db
    .prepare(
      "INSERT INTO users (first_name, last_name, age, email, password_hash, password_salt, password_iterations, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    )
    .run(firstName, lastName, age, email, hashHex, saltHex, PASSWORD_ITERATIONS);

  return { ok: true, created: true, userId: result.lastInsertRowid, email };
}

export function registerUser({ firstName, lastName, age, email, password }) {
  const safeEmail = normalizeEmail(email);
  const safeFirst = String(firstName || "").trim();
  const safeLast = String(lastName || "").trim();
  const safeAge = Number(age);
  const safePassword = String(password || "");

  if (!safeFirst || !safeLast) {
    return { ok: false, error: "Podaj imię i nazwisko." };
  }
  if (safeFirst.length > MAX_NAME_LEN || safeLast.length > MAX_NAME_LEN) {
    return { ok: false, error: `Imię i nazwisko mogą mieć maksymalnie ${MAX_NAME_LEN} znaków.` };
  }
  if (!Number.isInteger(safeAge) || safeAge < 18 || safeAge > 150) {
    return { ok: false, error: "Musisz mieć co najmniej 18 lat." };
  }
  if (!isValidEmail(safeEmail)) {
    return { ok: false, error: "Email jest nieprawidłowy." };
  }
  if (!passwordLooksOk(safePassword)) {
    return {
      ok: false,
      error: `Hasło musi mieć ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} znaków i zawierać literę oraz cyfrę.`,
    };
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(safeEmail);
  if (existing) return { ok: false, error: "Taki email już istnieje." };

  const saltHex = crypto.randomBytes(16).toString("hex");
  const hashHex = hashPassword(safePassword, saltHex, PASSWORD_ITERATIONS);

  const result = db
    .prepare(
      "INSERT INTO users (first_name, last_name, age, email, password_hash, password_salt, password_iterations, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
    )
    .run(safeFirst, safeLast, safeAge, safeEmail, hashHex, saltHex, PASSWORD_ITERATIONS);

  return { ok: true, userId: result.lastInsertRowid, email: safeEmail };
}

export function verifyLogin(email, password) {
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || "");
  if (!safeEmail || !safePassword) return { ok: false, error: "Brak danych logowania." };
  if (!isValidEmail(safeEmail)) return { ok: false, error: "Błędny email lub hasło." };
  if (safePassword.length > MAX_PASSWORD_LEN) return { ok: false, error: "Błędny email lub hasło." };

  const user = db
    .prepare(
      "SELECT id, email, first_name, last_name, is_admin, password_hash, password_salt, password_iterations FROM users WHERE email = ?",
    )
    .get(safeEmail);

  if (!user) return { ok: false, error: "Błędny email lub hasło." };

  const expected = hashPassword(safePassword, user.password_salt, user.password_iterations);
  if (!constantTimeEqualHex(expected, user.password_hash)) {
    return { ok: false, error: "Błędny email lub hasło." };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: Boolean(user.is_admin),
    },
  };
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();

  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAtIso);

  return { token, expiresAtMs };
}

export function clearSession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE id = ?").run(String(token));
}

export function setSessionCookie(res, token, expiresAtMs) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(expiresAtMs),
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax" });
}

export function attachUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    res.locals.user = null;
    return next();
  }

  const row = db
    .prepare(
      `SELECT
        s.id AS session_id,
        s.expires_at AS expires_at,
        u.id AS user_id,
        u.email AS email,
        u.first_name AS first_name,
        u.last_name AS last_name,
        u.is_admin AS is_admin
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    )
    .get(String(token));

  if (!row) {
    clearSessionCookie(res);
    res.locals.user = null;
    return next();
  }

  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    clearSession(row.session_id);
    clearSessionCookie(res);
    res.locals.user = null;
    return next();
  }

  const user = {
    id: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    isAdmin: Boolean(row.is_admin),
  };

  req.user = user;
  res.locals.user = user;
  return next();
}

export function requireUser(req, res, next) {
  if (req.user) return next();
  return res.redirect("/?error=login_required");
}

export default {
  ensureAdminUser,
  registerUser,
  verifyLogin,
  createSession,
  clearSession,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireUser,
};
