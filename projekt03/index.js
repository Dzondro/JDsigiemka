import express from "express";
import bodyParser from "body-parser";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

const DB_PATH = path.join(__dirname, "database.db");
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH);

// Create table if not exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// GET /
app.get("/", (req, res) => {
  db.all("SELECT * FROM posts ORDER BY id DESC", (err, rows) => {
    res.render("index", { posts: rows || [] });
  });
});

// GET /about
app.get("/about", (req, res) => {
  res.render("about");
});

// GET /edit/:id
app.get("/edit/:id", (req, res) => {
  db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], (err, row) => {
    res.render("edit", { post: row });
  });
});

// POST /add
app.post("/add", (req, res) => {
  db.run("INSERT INTO posts (title, content) VALUES (?, ?)",
    [req.body.title, req.body.content],
    () => res.redirect("/")
  );
});

// POST /edit/:id
app.post("/edit/:id", (req, res) => {
  db.run("UPDATE posts SET title=?, content=? WHERE id=?",
    [req.body.title, req.body.content, req.params.id],
    () => res.redirect("/")
  );
});

// POST /delete/:id
app.post("/delete/:id", (req, res) => {
  db.run("DELETE FROM posts WHERE id=?", [req.params.id], () => res.redirect("/"));
});

// POST /seed
app.post("/seed", (req, res) => {
  const demo = [
    ["Hello", "Pierwszy wpis"],
    ["Test", "Drugi wpis"],
    ["Edytuj mnie", "Przykład edycji"]
  ];
  const stmt = db.prepare("INSERT INTO posts (title, content) VALUES (?, ?)");
  demo.forEach(d => stmt.run(d));
  stmt.finalize(() => res.redirect("/"));
});

app.listen(PORT, () => console.log("Serwer działa na porcie", PORT));
