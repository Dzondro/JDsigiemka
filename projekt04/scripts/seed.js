import { db, initDb } from "../models/db.js";
import auth from "../models/auth.js";
//poniższa funkcja zrobiona z pomoca AI
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
      email: "janek@Sum.com",
      password: "Jan12345",
    },
    {
      firstName: "Zbigniew",
      lastName: "Nowak",
      age: 28,
      email: "Zbyszek@Karp.com",
      password: "Zbychu12345",
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
//posty do seeda wygenerowane z chata
  insertPost({
    title: "Witaj na Wędkarskim Blogu!",
    content: "To jest przykładowy post. Wpisy testowe są o rybach i wędkowaniu.",
    authorId: adminId,
  });

  const [u1, u2] = ensuredUsers;
  insertPost({
    title: "Mój pierwszy wypad na pstrąga",
    content:
      "Cześć! Startuję z blogiem. Na pstrąga najlepiej działały małe obrotówki i delikatne prowadzenie w nurcie.",
    authorId: u1.userId,
  });
  insertPost({
    title: "Jak dobrać przynętę na szczupaka",
    content:
      "W mętnej wodzie wybieram jaśniejsze kolory, a przy wietrze cięższe gumy. Na płytko często wygrywają woblery.",
    authorId: u2.userId,
  });

  console.log("Seed zakończony.");
  console.log(`Admin: ${adminResult.email}`);
  console.log(`Użytkownicy: ${ensuredUsers.map((u) => u.email).join(", ")}`);
}

main();
