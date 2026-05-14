export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DIM = 1920;
const IMG_QUALITY = 0.82;

export function assertFileSize(file: File): void {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
}

export function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('IMG_LOAD_FAILED')); };
    img.src = objectUrl;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target!.result as string);
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}
