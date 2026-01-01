import JSZip from 'jszip';
import { decode } from '@msgpack/msgpack';
import { parseConceptsStrokes } from './plistParser.js';
import { parseConceptsStrokesFromMessagePack, messagePackToJson } from './messagePackParser.js';
import type { DrawingData, ConceptPlists } from './types.js';

// Use require to get mutable reference to bplist-parser
const bplistParser = require('bplist-parser');

// File format types
type FileFormat = 'plist' | 'messagepack';

// Increase maxObjectCount to handle large documents (default is 32768)
bplistParser.maxObjectCount = 1000000;

/**
 * Handles .concept file loading and parsing
 */
export class FileHandler {
  /**
   * Detect file format based on ZIP contents
   */
  private detectFormat(zip: JSZip): FileFormat {
    // Check for MessagePack format (.concepts files with .pack files)
    if (zip.file('tree.pack')) {
      return 'messagepack';
    }
    // Default to plist format (.concept files with .plist files)
    return 'plist';
  }

  /**
   * Process a .concept or .concepts file and extract drawing data
   */
  async processConceptFile(file: File): Promise<DrawingData> {
    const lowerName = file.name.toLowerCase();

    // Validate file extension
    if (!lowerName.endsWith('.concept') && !lowerName.endsWith('.concepts')) {
      throw new Error('Please select a .concept or .concepts file');
    }

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Unzip the file
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Detect format and route to appropriate parser
    const format = this.detectFormat(zip);

    let drawingData: DrawingData;

    if (format === 'messagepack') {
      drawingData = await this.processMessagePackFormat(zip);
    } else {
      drawingData = await this.processPlistFormat(zip);
    }

    // Extract images and PDFs from ImportedImages folder (same for both formats)
    await this.loadImportedImages(zip, drawingData);

    return drawingData;
  }

  /**
   * Process plist format (.concept files from iPad)
   */
  private async processPlistFormat(zip: JSZip): Promise<DrawingData> {
    // Extract Strokes.plist
    const strokesFile = zip.file('Strokes.plist');
    if (!strokesFile) {
      throw new Error('Strokes.plist not found in .concept file');
    }

    // Get the binary plist data as Uint8Array
    const strokesBuffer = await strokesFile.async('uint8array');

    // Parse the binary plist using bplist-parser (bundled with esbuild)
    const parsed = await bplistParser.parseBuffer(Buffer.from(strokesBuffer));

    if (!parsed || !Array.isArray(parsed)) {
      throw new Error('Failed to parse Strokes.plist');
    }

    const plistData = parsed[0];
    return parseConceptsStrokes(plistData);
  }

  /**
   * Process MessagePack format (.concepts files from Android/Windows)
   */
  private async processMessagePackFormat(zip: JSZip): Promise<DrawingData> {
    // Extract tree.pack (contains stroke data)
    const treeFile = zip.file('tree.pack');
    if (!treeFile) {
      throw new Error('tree.pack not found in .concepts file');
    }

    // Get the MessagePack data as Uint8Array
    const treeBuffer = await treeFile.async('uint8array');

    // Decode MessagePack
    const decoded = decode(treeBuffer);

    return parseConceptsStrokesFromMessagePack(decoded);
  }

  /**
   * Load images and PDFs from ImportedImages folder
   */
  private async loadImportedImages(zip: JSZip, drawingData: DrawingData): Promise<void> {
    const importedImagesFolder = zip.folder('ImportedImages');
    if (!importedImagesFolder) {
      return;
    }

    const imagePromises = drawingData.images.map(async (image) => {
      // Try common image extensions and PDF
      const extensions = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'pdf'];
      for (const ext of extensions) {
        const imageFile = zip.file(`ImportedImages/${image.uuid}.${ext}`);
        if (imageFile) {
          const imageBuffer = await imageFile.async('uint8array');
          // Convert to base64 data URL
          const base64 = btoa(
            Array.from(imageBuffer)
              .map((byte) => String.fromCharCode(byte))
              .join('')
          );
          const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
          image.imageData = `data:${mimeType};base64,${base64}`;
          break;
        }
      }
    });
    await Promise.all(imagePromises);
  }

  /**
   * Set up drag-and-drop handlers on an element
   */
  setupDragAndDrop(
    element: HTMLElement,
    onFileLoaded: (data: DrawingData) => void,
    onError: (error: Error) => void
  ): void {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      element.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Highlight on drag over
    ['dragenter', 'dragover'].forEach((eventName) => {
      element.addEventListener(eventName, () => {
        element.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      element.addEventListener(eventName, () => {
        element.classList.remove('drag-over');
      });
    });

    // Handle dropped files
    element.addEventListener('drop', async (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      try {
        const data = await this.processConceptFile(file);
        onFileLoaded(data);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Set up file input handler
   */
  setupFileInput(
    input: HTMLInputElement,
    onFileLoaded: (data: DrawingData) => void,
    onError: (error: Error) => void
  ): void {
    input.addEventListener('change', async () => {
      const files = input.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      try {
        const data = await this.processConceptFile(file);
        onFileLoaded(data);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Process file and return both drawing data and all plists
   */
  private async processConceptFileWithPlists(file: File): Promise<{ data: DrawingData; plists: ConceptPlists }> {
    const drawingData = await this.processConceptFile(file);

    // Parse all plist files
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const plists: ConceptPlists = {
      strokes: null,
      drawing: null,
      resources: null,
      metadata: null,
    };

    // Helper to parse a plist file
    const parsePlist = async (filename: string): Promise<any> => {
      const file = zip.file(filename);
      if (!file) {
        console.warn(`${filename} not found in .concept file`);
        return null;
      }
      try {
        const buffer = await file.async('uint8array');
        const parsed = await bplistParser.parseBuffer(Buffer.from(buffer));
        return parsed[0];
      } catch (error) {
        console.error(`Failed to parse ${filename}:`, error);
        return null;
      }
    };

    // Parse all plists in parallel
    [plists.strokes, plists.drawing, plists.resources, plists.metadata] = await Promise.all([
      parsePlist('Strokes.plist'),
      parsePlist('Drawing.plist'),
      parsePlist('Resources.plist'),
      parsePlist('metadata.plist'),
    ]);

    return { data: drawingData, plists };
  }
}
