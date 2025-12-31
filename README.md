# Catan Resource Tracker Extension

A browser extension to track opponent resources in online Catan games.

## Features

- Track multiple opponents and their resources
- Manual resource counting (Wheat, Brick, Sheep, Wood, Ore)
- Persistent storage across browser sessions
- Clean, intuitive UI

## Installation

### Chrome/Edge
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file

## Development

The extension consists of:
- `manifest.json` - Extension configuration
- `popup.html/js` - Extension popup interface
- `content.js` - Script injected into game pages
- `background.js` - Background service worker
- `styles.css` - Popup styling
- `content.css` - Styles injected into game pages

## Usage

1. Click the extension icon while playing Catan online
2. Add players using the "Add Player" button
3. Manually track resources by clicking +/- buttons
4. Player data persists across sessions

## Future Enhancements

- Auto-detection of game events
- Integration with specific Catan platforms
- Statistics and analysis
- Export/import tracking data

## Notes

This extension is currently set up for manual tracking. Once you explain how the specific Catan website works, we can add automated tracking features.
