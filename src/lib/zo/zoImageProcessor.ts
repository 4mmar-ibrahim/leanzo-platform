/**
 * Cleanzo Zo Studio - Strictly Non-Destructive Original Image Handler
 * 
 * GUARANTEE:
 * 1. Original Image is the Source of Truth: NEVER removes backgrounds, NEVER erases pixels.
 * 2. Resolution Preserved: Never downscales (e.g. 2000x2000 stays 2000x2000).
 * 3. Format & Alpha Preserved: Keeps PNG transparency, WEBP, or JPG as uploaded.
 * 4. Zero Distortion: No stretching, no cropping, no mesh reconstruction.
 */

export interface OriginalImageMetadata {
  url: string;
  filename: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  mimeType: string;
  aspectRatio: number;
}

export interface ProcessedCharacterImage {
  dataUrl: string;
  svgDataUrl?: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  trimmed: boolean;
  bgRemoved: boolean;
  dominantBgColors?: Array<{ r: number; g: number; b: number }>;
}

export interface ImageProcessingOptions {
  tolerance?: number;
  featherRadius?: number;
  blendWithSiteTheme?: 'none' | 'dark' | 'light';
  targetResolution?: number;
  removeBackground?: boolean;
}

/**
 * Safely reads the original natural dimensions and details of an uploaded image
 * WITHOUT mutating, re-encoding, or downscaling the image in any way.
 */
export async function getOriginalImageDetails(file: File): Promise<OriginalImageMetadata> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const format = file.name.split('.').pop()?.toUpperCase() || 'IMAGE';
      const aspectRatio = width / (height || 1);

      // Keep object URL or let consumer manage it
      resolve({
        url: objectUrl,
        filename: file.name,
        width,
        height,
        fileSize: file.size,
        format,
        mimeType: file.type || 'image/png',
        aspectRatio,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('فشل قراءة بيانات ملف الصورة: ' + String(err)));
    };

    img.src = objectUrl;
  });
}

/**
 * Backwards-compatible facade: strictly returns the untouched original data
 * with 0 background removal and 0 quality loss.
 */
export async function processAndEnhanceCharacterImage(
  file: File,
  _options: ImageProcessingOptions = {}
): Promise<ProcessedCharacterImage> {
  const details = await getOriginalImageDetails(file);

  // Read original file as clean base64 Data URL without any canvas redraw or re-compression
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    dataUrl,
    width: details.width,
    height: details.height,
    originalWidth: details.width,
    originalHeight: details.height,
    trimmed: false,
    bgRemoved: false,
    dominantBgColors: [],
  };
}
