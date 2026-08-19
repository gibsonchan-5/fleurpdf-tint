# FleurPDF tint

> Change PDF page background color in Obsidian — with patterns, templates, and zero CSS knowledge required.

## Why

Obsidian's built-in PDF viewer renders pages on a bright white canvas. Long reading sessions cause eye strain, especially in low-light environments.

While you can tweak PDF background colors with CSS snippets or the [PDF++](https://github.com/nhaouari/obsidian-pdf-plus) plugin, both require technical know-how and only support solid colors. **FleurPDF tint** fills the gap: a dedicated, GUI-first plugin that makes PDF reading comfortable for everyone.

## Features

### 9 Built-in Presets
One click to switch between carefully curated colors:

| Preset | Color | Best For |
|--------|-------|----------|
| None | `#FFFFFF` | Default |
| Eye Green | `#C7EDCC` | Extended reading |
| Warm Yellow | `#F5EED6` | Warm, cozy feel |
| Cream | `#F5F0E1` | Neutral warmth |
| Sky Blue | `#D6EBF5` | Cool, calm focus |
| Parchment | `#E8DCC5` | Vintage documents |
| Rose Beige | `#F0E0D6` | Soft, feminine |
| Ink Gray | `#E8E8E0` | Minimal, professional |
| Dark | `#2C2C2C` | Night reading |

### 8 Pattern Overlays
Add texture to your PDF pages with 8 pattern types:

- **Dot** — subtle dot grid
- **Grid** — graph paper style
- **Line** — ruled notebook lines
- **Diagonal** — slanted lines
- **Cross** — diagonal crosshatch
- **Zigzag** — chevron texture
- **Stripe** — vertical bands

Each pattern has adjustable **spacing**, **size**, **color**, and **opacity**.

### Custom Template System
Create and manage your own templates:

1. **Create** — generate a new template with a single click
2. **Customize** — pick any color, choose a pattern, tweak every parameter
3. **Name** — give each template a recognizable name
4. **Manage** — edit or delete templates in the settings panel

### Sidebar Quick Switch
Open the sidebar to switch between presets and custom templates in one click. Includes a **Reset** button (returns to None) and a **Settings** shortcut.

### Smart Performance
- CSS variables for real-time slider updates — no DOM thrashing
- `mix-blend-mode` temporarily disabled during drag for smooth GPU rendering
- Only applies to active PDF viewer, zero overhead on notes

## How It Works

The plugin uses `mix-blend-mode: multiply` to make the original PDF white transparent, then applies your chosen background color underneath. This approach preserves all PDF content (text, images, annotations) without modifying the source file.

For dark backgrounds, it automatically switches to `mix-blend-mode: screen` for correct color inversion.

## Installation

### From Obsidian Community Plugins (coming soon)
1. Open Settings → Community plugins → Browse
2. Search "FleurPDF tint"
3. Install and enable

### Manual Install
1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/gibsonchan-5/fleurpdf-tint/releases)
2. Create the folder `.obsidian/plugins/fleurpdf-tint/` in your vault
3. Copy all three files into the folder
4. Restart Obsidian and enable the plugin under Settings → Community plugins

## Usage

1. **Open a PDF** in Obsidian
2. **Open the sidebar** via the ribbon icon or command palette
3. **Click any preset** card to apply instantly
4. **Customize** in Settings → FleurPDF tint

## Comparison

| Feature | FleurPDF tint | PDF++ | Theme Quick Switch | CSS Snippet |
|---------|---------------|-------|-------------------|-------------|
| GUI color picker | Yes | No | No | No |
| Pattern overlay | Yes (8 types) | No | No | Manual |
| Custom templates | Yes | No | No | No |
| Sidebar quick switch | Yes | No | No | No |
| No CSS knowledge needed | Yes | No | Partial | No |
| Real-time preview | Yes | Yes | No | No |

## Privacy & Security

- **No network requests** — works 100% offline
- **No telemetry** — collects zero usage data
- **No external APIs** — no accounts, no tracking
- **Local only** — all settings stored in Obsidian's plugin data API
- **No eval or dynamic code execution**

## Technical Details

- Built with TypeScript + esbuild
- Compatible with Obsidian 1.13.0+
- Works on desktop and mobile
- License: MIT

## Credits

Inspired by the [PaperCraft](https://github.com/gibsonchan-5/PaperCraft) plugin's template management pattern and texture design.

## License

MIT © gibsonchan-5
