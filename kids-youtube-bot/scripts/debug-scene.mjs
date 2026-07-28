import http from "http";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".min.js": "text/javascript",
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://127.0.0.1");
  let p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    p = path.join(ROOT, "assets/3d/scene.html");
  }
  const ext = path.extname(p);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("requestfailed", (r) => console.log("FAIL", r.url(), r.failure()?.errorText));

const url =
  `http://127.0.0.1:${port}/assets/3d/scene.html?character=dolphin&mood=intro&greenscreen=1&talking=1`;
console.log("URL", url);
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
const ready = await page.evaluate(() => !!window.__ready);
console.log("READY", ready);
await page.screenshot({ path: path.join(ROOT, "output/debug-dolphin.png") });
await browser.close();
server.close();
