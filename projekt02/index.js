import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let posts = [];

app.get("/", (req, res) => {
  res.render("index", { posts });
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.post("/add", (req, res) => {
  const { title, content } = req.body;
  if (title && content) {
    posts.push({ title, content, date: new Date().toLocaleString() });
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
