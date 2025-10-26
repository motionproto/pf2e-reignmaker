/**
 * Image Processing Utility
 * Handles client-side image processing for map icons and other assets
 */

/**
 * Process an image file for use as a map icon
 * - Crops to square (center crop)
 * - Scales to 128x128 pixels
 * - Converts to WebP format
 * 
 * @param file - The image file to process
 * @returns Promise<Blob> - The processed image as a WebP blob
 */
export async function processMapIcon(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      try {
        // Set canvas to target size
        const targetSize = 128;
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // Calculate center crop to square
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          offsetX, offsetY, size, size,  // Source rect (crop to square)
          0, 0, targetSize, targetSize   // Dest rect (scale to 128x128)
        );
        
        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create WebP blob'));
            }
          },
          'image/webp',
          0.9  // 90% quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitize a settlement name for use as a filename
 * Converts to lowercase and replaces non-alphanumeric characters with hyphens
 * 
 * @param name - The settlement name to sanitize
 * @returns The sanitized filename (without extension)
 */
export function sanitizeSettlementName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')  // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens
}
