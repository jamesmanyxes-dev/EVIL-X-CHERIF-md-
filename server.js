const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 10000;
const BOT_API_URL = process.env.BOT_API_URL || "";
const BOT_API_SECRET = process.env.BOT_API_SECRET || "";

const index = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "public", "style.css"), "utf8");

function esc(v) {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function render(result = "", status = "ONLINE", uptime = "Connected") {
  return index
    .replace("{{RESULT}}", result)
    .replace("{{STATUS}}", esc(status))
    .replace("{{UPTIME}}", esc(uptime));
}

function postToBot(phone) {
  return new Promise((resolve, reject) => {
    if (!BOT_API_URL) return reject(new Error("BOT_API_URL is not configured on Render."));

    const target = new URL(BOT_API_URL);
    const body = JSON.stringify({ phone });

    const req = httpOrHttps(target.protocol).request({
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: target.pathname + target.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-pair-secret": BOT_API_SECRET
      },
      timeout: 30000
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(data || "{}");
          if (res.statusCode >= 200 && res.statusCode < 300 && json.code) return resolve(json);
          reject(new Error(json.error || "Bot server rejected the pairing request."));
        } catch {
          reject(new Error("Invalid response from bot server."));
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("Bot server timed out.")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpOrHttps(protocol) {
  return protocol === "https:" ? require("https") : require("http");
}

function form(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", c => { body += c; if (body.length > 4096) req.destroy(); });
    req.on("end", () => {
      const p = new URLSearchParams(body);
      resolve(p.get("phone") || "");
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && u.pathname === "/style.css") {
      res.writeHead(200, {"Content-Type":"text/css; charset=utf-8","Cache-Control":"public,max-age=3600"});
      return res.end(css);
    }

    if (req.method === "GET" && u.pathname === "/health") {
      res.writeHead(200, {"Content-Type":"application/json"});
      return res.end(JSON.stringify({status:"ok"}));
    }

    if (req.method === "GET" && u.pathname === "/") {
      res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
      return res.end(render());
    }

    if (req.method === "POST" && u.pathname === "/pair") {
      const phone = (await form(req)).replace(/\D/g, "");
      if (phone.length < 7 || phone.length > 15) {
        res.writeHead(400, {"Content-Type":"text/html; charset=utf-8"});
        return res.end(render('<div class="result"><div class="error">Enter a valid international phone number using digits only.</div></div>', "ONLINE", "Ready"));
      }

      try {
        const data = await postToBot(phone);
        const result = `
          <div class="result">
            <div class="result-title">PAIRING CODE</div>
            <div class="code-box">
              <div class="code">${esc(data.code)}</div>
              <div class="copy-note">USE THE CODE<br>IN WHATSAPP</div>
            </div>
            <p class="instructions">WhatsApp → Linked Devices → Link a device → Link with phone number → enter the code above.</p>
          </div>`;
        res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
        return res.end(render(result, "ONLINE", data.uptime || "Connected"));
      } catch (e) {
        res.writeHead(502, {"Content-Type":"text/html; charset=utf-8"});
        return res.end(render(`<div class="result"><div class="error">⚠ ${esc(e.message)}</div></div>`, "BOT UNAVAILABLE", "Connection failed"));
      }
    }

    res.writeHead(404, {"Content-Type":"text/plain"});
    res.end("Not found");
  } catch (e) {
    res.writeHead(500, {"Content-Type":"text/plain"});
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`EVIL BOT website listening on ${PORT}`));
