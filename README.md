# EVIL-X-CHERIF-md-
# EVIL BOT — WhatsApp Pairing Website

A dark storm/rain themed Render site with green/red lightning styling.

## Files

- `public/index.html` — frontend, HTML only
- `public/style.css` — all visual design and rain/lightning animations
- `server.js` — Render backend bridge
- `package.json` — Render start command
- `BOT_PATCH.txt` — exact patch for your existing bot

## Deploy

Create a Render Web Service from this folder.

Build Command:
  npm install

Start Command:
  npm start

Environment variables:
  BOT_API_URL=https://YOUR-BOT-DOMAIN/api/pair
  BOT_API_SECRET=your-long-random-secret

The browser-facing website has no JavaScript. The backend uses Node because
your actual WhatsApp bot is Node/Baileys and must generate the real code.

Your existing bot already calls Baileys `requestPairingCode()`. Apply
BOT_PATCH.txt to expose a protected `/api/pair` endpoint.
