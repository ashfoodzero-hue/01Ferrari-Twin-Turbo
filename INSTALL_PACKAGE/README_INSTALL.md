# Ferrari Twin Turbo — install on another PC

This is a **paper** app. It draws the SCALP and SWING TRADE boxes and sends Telegram notices. It never places an order.

## What you need

- **Windows 10 or 11**, with **Node.js 22+**. Get it from https://nodejs.org (LTS), or run `winget install OpenJS.NodeJS.LTS`.
- **A Polygon (Massive) API key (required).** It needs a real-time forex plan, which gives the live gold ticks, the DXY pairs and the history.
- **Optional:**
  - a Telegram bot token + chat id, for "TRADE SETUP READY" messages (Entry, SL, TP1, TP2, TP3);
  - a Databento key;
  - a FRED key.

> ⚠ **One Polygon key = one live tick connection (measured 2026-10-15).** A second PC using the same key knocks the first
> one off, and they keep fighting. Stop the app on the old PC first, or give the new PC its own key.

## Install (3 steps)

1. Copy the whole `FerrariTwinTurbo` folder to the new PC, for example to `C:\Ferrari Twin Turbo`.
2. Double-click **`INSTALL.cmd`**. The installer:
   - opens the **⚙ API keys** page. Paste each key, press **Test** (Polygon must show "history ✓ · live ticks ✓"), then **💾 Save**;
   - downloads the price minutes missing since the package was built;
   - registers the auto-start watchdog (every 5 min and at logon) and puts a **Ferrari Twin Turbo** shortcut on the Desktop;
   - starts the app and opens the live chart at http://127.0.0.1:7444.
3. Done. Use the Desktop shortcut from now on.

## Change keys later

Open the chart and click **⚙ API keys** (top bar), or go to http://127.0.0.1:7445.
- Telegram changes and the SCALP/SWING alert switches work from the next tick.
- A changed Polygon or Databento key needs an app restart.

## Telegram settings (in ⚙ API keys)

| Setting | Meaning |
|---|---|
| Telegram bot token | from @BotFather |
| Telegram chat id | your chat, or a group id (starts with -100). **Test** sends a message there. |
| SCALP alerts | `1` on (default), `0` off. These are the Ferrari Matrix 3m trades. |
| SWING TRADE alerts | `1` on (default), `0` off. These are forward arms 1 and 2. |

- Each setup is sent **once**, when it opens.
- A setup recorded more than 30 minutes after its bar is not sent, because the entry is no longer "ready".
- **TP3 for SCALP, and TP2/TP3 for SWING TRADE, are reference levels.** They are equal steps beyond the measured target(s), and the message labels them as reference. The measured exits are SCALP TP1 + TP2, and SWING TP1.

## Build a fresh package (on the main PC)

```
node INSTALL_PACKAGE/build_package.mjs          (full: code + settings + all data, ~16 GB)
node INSTALL_PACKAGE/build_package.mjs --lite   (no price history: ~0.5 GB, the installer downloads it, slow)
```

The package never contains your `.env` keys.
