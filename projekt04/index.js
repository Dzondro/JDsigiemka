import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import settings from "./models/settings.js";
import { db, initDb } from "./models/db.js";
import auth from "./models/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const MAX_POST_TITLE_LEN = 120;
const MAX_POST_CONTENT_LEN = 5000;

function validatePostInput(title, content) {
  const safeTitle = String(title || "").trim();
  const safeContent = String(content || "").trim();

  if (!safeTitle || !safeContent) {
    return { ok: false, error: "Tytuł i treść są wymagane." };
  }
  if (safeTitle.length > MAX_POST_TITLE_LEN) {
    return { ok: false, error: `Tytuł może mieć maksymalnie ${MAX_POST_TITLE_LEN} znaków.` };
  }
  if (safeContent.length > MAX_POST_CONTENT_LEN) {
    return { ok: false, error: `Treść może mieć maksymalnie ${MAX_POST_CONTENT_LEN} znaków.` };
  }
  return { ok: true, title: safeTitle, content: safeContent };
}

initDb();
auth.ensureAdminUser();

app.use(bodyParser.urlencoded({ extended: true, limit: "25kb", parameterLimit: 200 }));
app.use(bodyParser.json({ limit: "25kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(cookieParser());
app.use(auth.attachUser);

const settingsRouter = express.Router();
settingsRouter.use("/toggle-theme", settings.themeToggle);
app.use("/settings", settingsRouter);

function settingsLocals(req, res, next) {
  res.locals.app = settings.getSettings(req);
  res.locals.page = req.path;
  if (typeof res.locals.user === "undefined") res.locals.user = null;
  next();
}
app.use(settingsLocals);

const authRouter = express.Router();

authRouter.post("/register", (req, res) => {
  const result = auth.registerUser({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    age: req.body.age,
    email: req.body.email,
    password: req.body.password,
  });

  if (!result.ok) return res.status(400).json(result);

  const session = auth.createSession(result.userId);
  auth.setSessionCookie(res, session.token, session.expiresAtMs);
  return res.json({ ok: true });
});

authRouter.post("/login", (req, res) => {
  const result = auth.verifyLogin(req.body.email, req.body.password);
  if (!result.ok) return res.status(400).json(result);

  const session = auth.createSession(result.user.id);
  auth.setSessionCookie(res, session.token, session.expiresAtMs);
  return res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  const token = req.cookies?.session;
  auth.clearSession(token);
  auth.clearSessionCookie(res);
  return res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  return res.json({ ok: true, user: req.user || null });
});

app.use("/auth", authRouter);

app.get("/", (req, res) => {
  const posts = db
    .prepare(
      `SELECT
        p.id AS id,
        p.title AS title,
        p.content AS content,
        p.created_at AS date,
        p.author_id AS authorId,
        u.first_name AS firstName,
        u.last_name AS lastName
      FROM posts p
      JOIN users u ON u.id = p.author_id
      ORDER BY p.id DESC`,
    )
    .all();

  const error = req.query?.error || null;
  res.render("index", { posts, error });
});

app.get("/posts/:id/edit", auth.requireUser, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).send("Nieprawidłowe ID posta.");

  const post = db
    .prepare("SELECT id, title, content, author_id AS authorId FROM posts WHERE id = ?")
    .get(id);

  if (!post) return res.status(404).send("Nie znaleziono posta.");
  if (post.authorId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).send("Brak uprawnień do edycji.");
  }

  return res.render("edit", { post });
});

app.post("/posts/:id/edit", auth.requireUser, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).send("Nieprawidłowe ID posta.");

  const post = db.prepare("SELECT id, author_id AS authorId FROM posts WHERE id = ?").get(id);
  if (!post) return res.status(404).send("Nie znaleziono posta.");
  if (post.authorId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).send("Brak uprawnień do edycji.");
  }

  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const validated = validatePostInput(title, content);
  if (!validated.ok) return res.status(400).send(validated.error);

  db.prepare("UPDATE posts SET title = ?, content = ? WHERE id = ?")
    .run(validated.title, validated.content, id);
  return res.redirect("/");
});

app.post("/posts/:id/delete", auth.requireUser, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).send("Nieprawidłowe ID posta.");

  const post = db.prepare("SELECT id, author_id AS authorId FROM posts WHERE id = ?").get(id);
  if (!post) return res.status(404).send("Nie znaleziono posta.");
  if (post.authorId !== req.user.id && !req.user.isAdmin) {
    return res.status(403).send("Brak uprawnień do usunięcia.");
  }

  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  return res.redirect("/");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.post("/add", auth.requireUser, (req, res) => {
  const validated = validatePostInput(req.body?.title, req.body?.content);
  if (!validated.ok) return res.status(400).send(validated.error);

  db.prepare("INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)")
    .run(validated.title, validated.content, req.user.id);
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
