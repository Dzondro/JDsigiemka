// Ten plik został wygenerowany z pomocą chata. Bazy testowe też zostały wygenerowane.
import { db, initDb } from "../models/db.js";
import auth from "../models/auth.js";

function getUserIdByEmail(email) {
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  return row?.id ?? null;
}

function ensureUser({ firstName, lastName, age, email, password }) {
  const existingId = getUserIdByEmail(email);
  if (existingId) return { ok: true, created: false, userId: existingId, email };

  const created = auth.registerUser({ firstName, lastName, age, email, password });
  if (!created.ok) return created;
  return { ok: true, created: true, userId: created.userId, email: created.email };
}

function insertPost({ title, content, authorId }) {
  db.prepare("INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)").run(title, content, authorId);
}

function main() {
  initDb();
  const adminResult = auth.ensureAdminUser();
  if (!adminResult.ok) {
    console.error(adminResult);
    process.exitCode = 1;
    return;
  }

  const postsCount = db.prepare("SELECT COUNT(*) AS c FROM posts").get()?.c ?? 0;
  if (Number(postsCount) > 0 && process.env.SEED_FORCE !== "1") {
    console.log("Seed pominięty: tabela posts nie jest pusta. Ustaw SEED_FORCE=1 aby dosiać mimo to.");
    return;
  }

  const users = [
    {
      firstName: "Jan",
      lastName: "Kowalski",
      age: 25,
      email: "jan@example.com",
      password: "Jan12345",
    },
    {
      firstName: "Anna",
      lastName: "Nowak",
      age: 28,
      email: "anna@example.com",
      password: "Anna12345",
    },
  ];

  const ensuredUsers = [];
  for (const u of users) {
    const r = ensureUser(u);
    if (!r.ok) {
      console.error(r);
      process.exitCode = 1;
      return;
    }
    ensuredUsers.push(r);
  }

  const adminId = getUserIdByEmail(adminResult.email);
  if (!adminId) {
    console.error("Nie znaleziono admina po ensureAdminUser().");
    process.exitCode = 1;
    return;
  }

  if (process.env.SEED_FORCE === "1") {
    db.prepare("DELETE FROM posts").run();
  }

  insertPost({
    title: "Witaj na blogu!",
    content: "To jest przykładowy post wygenerowany przez skrypt seed.",
    authorId: adminId,
  });

  const [u1, u2] = ensuredUsers;
  insertPost({
    title: "Mój pierwszy post",
    content: "Cześć! Testuję dodawanie postów w aplikacji.",
    authorId: u1.userId,
  });
  insertPost({
    title: "Drugi wpis",
    content: "To jest kolejny przykładowy wpis (seed).",
    authorId: u2.userId,
  });

  console.log("Seed zakończony.");
  console.log(`Admin: ${adminResult.email}`);
  console.log(`Użytkownicy: ${ensuredUsers.map((u) => u.email).join(", ")}`);
}

main();

