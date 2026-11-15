/**
 * Downscales and compresses high-resolution smartphone camera photos in the browser
 * before sending them to the server for Gemini multimodal OCR.
 * Preserves sharp label text legibility at up to 1600px max dimension while reducing
 * 12–48 MP camera payloads from ~8–15 MB down to ~150–300 KB for fast cellular uploads.
 */
export async function compressLabelImage(
  file: File,
  maxDimension = 1600,
  quality = 0.84
): Promise<{ dataUrl: string; width: number; height: number; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      if (!resultStr) {
        reject(new Error('Empty image file.'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to raw base64 if image decoding fails
        resolve({
          dataUrl: resultStr,
          width: 0,
          height: 0,
          sizeKb: Math.round(file.size / 1024)
        });
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: resultStr,
            width,
            height,
            sizeKb: Math.round(file.size / 1024)
          });
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          width,
          height,
          sizeKb: Math.max(1, Math.round(approxBytes / 1024))
        });
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}
