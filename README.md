# Catan Resource Tracker Extension

Browser extension that automatically tracks opponent resources on colonist.io.

## Supported Site

- **colonist.io** (extension is scoped to this domain)

## Features

- Auto-parse colonist.io game log to track resources per player
- Handles steals, discards, builds, trades, monopoly, and unknown-card deduction
- Floating draggable/resizable window with light/dark theme toggle
- Per-player colored names (matching in-game color) and unknown resource tracking
- Dev card bank counter (remaining out of 25) in the header
- Compact sidebar button to reopen the tracker
- Persistent storage across sessions

## Installation (Load Unpacked)

### Chrome / Edge
1. Go to `chrome://extensions/` or `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder (with `manifest.json`)

### Firefox (temporary load)
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json`

## Usage

1. Open a game on [https://colonist.io](https://colonist.io)
2. The floating tracker appears; drag/resize as needed
3. Close the tracker to show the sidebar button; click it to reopen
4. Watch resources, steals, and dev-card counter update automatically

## Folder Structure

- `manifest.json` – Extension config (scoped to colonist.io)
- `content.js`, `logMonitor.js`, `gameLog.js`, `player.js`, `resourceTable.js` – Core logic and UI
- `themes.css`, `content.css`, `styles.css` – Styling
- `images/` – Resource icons (including unknown.svg)
- `popup.html` – Popup explaining usage
- `ss/` – Screenshots for README (add your gameplay captures here)

## Game Rules

- For rules and gameplay details, please read the official rules on [colonist.io](https://colonist.io). This extension focuses solely on tracking.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
