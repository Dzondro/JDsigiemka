import { createServer } from "node:http";
import { fstat, readFileSync } from "node:fs";
import { URL } from "node:url";

const index_html = readFileSync("index.html");
const favicon = readFileSync("fav.ico");

const server = createServer((req, res) => {
  const request_url = new URL(`http://${host}${req.url}`);
  const path = request_url.pathname;
  console.log(`Request: ${req.method} ${path}`);

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Not allowed\n");
  }

  if (!res.writableEnded && path === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(index_html);
  }

  if (!res.writableEnded && path === "/favicon.ico") {
    res.writeHead(200, { "Content-Type": "image/x-icon" });
    res.end(favicon);
  }

  if (!res.writableEnded) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("WE dont have that in here\n");
  }
});

const port = 8000;
const host = "localhost";

server.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
});