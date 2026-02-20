# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based viewer for Concepts app files (.concept/.concepts format) from all platforms (iOS, Android, Windows). A React SPA that parses proprietary binary formats and renders drawings to HTML Canvas.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server with file watching (http://localhost:8000)
npm run build      # Build bundle only
npm run deploy     # Build and deploy to GitHub Pages
```

## Architecture

### File Format Parsing

The app handles two distinct binary formats inside ZIP archives:

- **`.concept` files (iPad/iOS)**: Contains `Strokes.plist` (binary plist). Parsed by `src/parsers/plistParser.ts` using bplist-parser.
- **`.concepts` files (Android/Windows)**: Contains `tree.pack` (MessagePack). Parsed by `src/parsers/messagePackParser.ts`.

Both parsers output a unified `DrawingData` type containing strokes and imported images.

### Core Flow

1. `FileHandler` (src/fileHandler.ts) - Unzips files, detects format, routes to correct parser
2. Parsers extract stroke data (points, colors, transforms, brush widths)
3. `StrokeRenderer` (src/strokeRenderer.ts) - Renders to Canvas with pan/zoom/rotation support
4. `ImageRenderer` (src/imageRenderer.ts) - Handles imported images and PDF pages (via pdfjs-dist)

### Coordinate System

Concepts uses a bottom-left origin coordinate system. The renderer applies a global Y-flip transformation to convert to Canvas's top-left origin.

### React Pages

- `/` - Home page with file upload and recent files
- `/viewer` - Single file viewer with Canvas
- `/gallery/*` - Directory browser with thumbnail grid

### Key Dependencies

- `jszip` - ZIP extraction (marked as external in esbuild)
- `bplist-parser` - Binary plist parsing (iOS format)
- `@msgpack/msgpack` - MessagePack decoding (Android/Windows format)
- `pdfjs-dist` - PDF rendering for imported PDFs
- `idb-keyval` - IndexedDB storage for recent files

### Build System

esbuild bundles TypeScript/TSX to `dist/bundle.js`. The build script (`esbuild.config.js`) also copies static assets and the PDF.js worker to dist.
