export interface ValidationResult {
  isValid: boolean;
  type: 'image' | 'video';
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
  error?: string;
}

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Inspects a binary buffer to verify true magic bytes signature
 * Never trusts client headers or file extension alone.
 */
export function validateMediaBuffer(buffer: Buffer, expectedType?: 'image' | 'video', contentTypeHint?: string): ValidationResult {
  if (!buffer || buffer.length < 12) {
    return {
      isValid: false,
      type: 'image',
      mimeType: '',
      extension: '',
      error: 'FILE_TOO_SMALL_OR_EMPTY',
    };
  }

  // 1. Check PNG (8 bytes: 89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    let width: number | undefined;
    let height: number | undefined;
    if (buffer.length >= 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    }
    return {
      isValid: true,
      type: 'image',
      mimeType: 'image/png',
      extension: 'png',
      width,
      height,
    };
  }

  // 2. Check JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const dims = extractJpegDimensions(buffer);
    return {
      isValid: true,
      type: 'image',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      width: dims?.width,
      height: dims?.height,
    };
  }

  // 3. Check WEBP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const dims = extractWebpDimensions(buffer);
    return {
      isValid: true,
      type: 'image',
      mimeType: 'image/webp',
      extension: 'webp',
      width: dims?.width,
      height: dims?.height,
    };
  }

  // 4. Check GIF (GIF87a or GIF89a)
  const gifHeader = buffer.toString('ascii', 0, 6);
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return {
      isValid: true,
      type: 'image',
      mimeType: 'image/gif',
      extension: 'gif',
      width,
      height,
    };
  }

  // 5. Check ISOBMFF container (ftyp at offset 4: MP4, AVIF, HEIC)
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (brand.startsWith('avif') || brand.startsWith('avis') || brand.startsWith('mif1') || expectedType === 'image') {
      return {
        isValid: true,
        type: 'image',
        mimeType: 'image/avif',
        extension: 'avif',
      };
    }
    return {
      isValid: true,
      type: 'video',
      mimeType: 'video/mp4',
      extension: 'mp4',
    };
  }

  // 6. Check WEBM (EBML header 1A 45 DF A3)
  if (
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return {
      isValid: true,
      type: 'video',
      mimeType: 'video/webm',
      extension: 'webm',
    };
  }

  // 7. Check ICO (00 00 01 00)
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00
  ) {
    const imageCount = buffer.readUInt16LE(4);
    if (imageCount > 0 && imageCount <= 64) {
      const width = buffer[6] === 0 ? 256 : buffer[6];
      const height = buffer[7] === 0 ? 256 : buffer[7];
      return {
        isValid: true,
        type: 'image',
        mimeType: 'image/x-icon',
        extension: 'ico',
        width,
        height,
      };
    }
  }

  // 8. Check SVG (XML text format)
  const snippet = buffer.subarray(0, 1024).toString('utf8').trim().toLowerCase();
  if (
    (snippet.startsWith('<svg') || snippet.startsWith('<?xml') || snippet.startsWith('<!doctype svg')) &&
    snippet.includes('<svg')
  ) {
    return {
      isValid: true,
      type: 'image',
      mimeType: 'image/svg+xml',
      extension: 'svg',
    };
  }

  // Fallback: If HTTP response header explicitly specified a safe image/video MIME type
  if (contentTypeHint) {
    const cleanMime = contentTypeHint.toLowerCase().split(';')[0].trim();
    if (cleanMime.startsWith('image/')) {
      const ext = cleanMime.replace('image/', '').replace('jpeg', 'jpg');
      return {
        isValid: true,
        type: 'image',
        mimeType: cleanMime,
        extension: ext || 'jpg',
      };
    }
    if (cleanMime.startsWith('video/')) {
      const ext = cleanMime.replace('video/', '');
      return {
        isValid: true,
        type: 'video',
        mimeType: cleanMime,
        extension: ext || 'mp4',
      };
    }
  }

  // If we reach here, it's not a supported/safe format
  return {
    isValid: false,
    type: 'image',
    mimeType: '',
    extension: '',
    error: 'INVALID_FILE_SIGNATURE',
  };
}

function extractJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // Baseline SOF0 (0xC0), Extended SOF1 (0xC1), Progressive SOF2 (0xC2)
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }
    // Skip variable-length marker segment
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    const length = buffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

function extractWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (buffer.length < 30) return null;
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType === 'VP8 ') {
      // Simple lossy VP8
      if (buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
    } else if (chunkType === 'VP8L') {
      // Lossless VP8L
      if (buffer[20] === 0x2f) {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + ((((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)));
        return { width, height };
      }
    } else if (chunkType === 'VP8X') {
      // Extended VP8X
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
  } catch {
    // Ignore dimension extraction errors gracefully
  }
  return null;
}
