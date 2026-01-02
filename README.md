# Concepts File Viewer

Web-based viewer for iOS Concepts app files (.concept format).

## Features

- **Drag & Drop Interface** - Drop .concept files directly into the browser
- **Stroke Rendering** - Displays all strokes with accurate colors and line widths
- **Pan & Zoom** - Mouse wheel to zoom, click and drag to pan
- **Touch Support** - Pinch to zoom and drag on mobile/tablet devices
- **Transform Support** - Correctly applies affine transformations to strokes
- **High-DPI Support** - Sharp rendering on Retina and other high-DPI displays
- **Export Data** - Download parsed binary plists as JSON files (for debugging)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:8000 and drag a .concept file onto the page.

## Development

- `npm run dev` - Start development server with file watching
- `npm run build` - Build bundle only
- `npm run watch` - Watch and rebuild on changes
- `npm run serve` - Serve files (dev server)

## Tech Stack

- TypeScript
- Express (dev server)
- esbuild (bundling)
- Canvas API (rendering)

## Todo:
- **Support for other drawing tools** - Dotted line tool, images, etc
- **Desktop app** - allows for file association, double-click a concept file to view!
- **Better UI** - Current view is functional, but could use space better and offer more options