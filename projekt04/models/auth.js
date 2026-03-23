import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha256";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

export function registerUser({ firstName, lastName, age, email, password }) {
  const safeEmail = normalizeEmail(email);
  const safeFirst = String(firstName || "").trim();
  const safeLast = String(lastName || "").trim();
  const safeAge = Number(age);
  const safePassword = String(password || "");

  if (!safeFirst || !safeLast) {
    return { ok: false, error: "Podaj imię i nazwisko." };
  }
  if (!Number.isFinite(safeAge) || safeAge < 0 || safeAge > 150) {
    return { ok: false, error: "Wiek jest nieprawidłowy." };
  }
  if (!safeEmail.includes("@")) {
    return { ok: false, error: "Email jest nieprawidłowy." };
  }
  if (safePassword.length < 6) {
    return { ok: false, error: "Hasło musi mieć co najmniej 6 znaków." };
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(safeEmail);
  if (existing) return { ok: false, error: "Taki email już istnieje." };

  const saltHex = crypto.randomBytes(16).toString("hex");
  const hashHex = hashPassword(safePassword, saltHex, PASSWORD_ITERATIONS);

  const result = db
    .prepare(
      "INSERT INTO users (first_name, last_name, age, email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(safeFirst, safeLast, safeAge, safeEmail, hashHex, saltHex, PASSWORD_ITERATIONS);

  return { ok: true, userId: result.lastInsertRowid, email: safeEmail };
}

export function verifyLogin(email, password) {
  const safeEmail = normalizeEmail(email);
  const safePassword = String(password || "");
  if (!safeEmail || !safePassword) return { ok: false, error: "Brak danych logowania." };

  const user = db
    .prepare(
      "SELECT id, email, first_name, last_name, password_hash, password_salt, password_iterations FROM users WHERE email = ?",
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
        u.last_name AS last_name
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
  registerUser,
  verifyLogin,
  createSession,
  clearSession,
  setSessionCookie,
  clearSessionCookie,
  attachUser,
  requireUser,
};
