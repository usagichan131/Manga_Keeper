/**
 * Resize and compress image to base64 format for Firestore storage efficiency.
 * Target size is roughly <100KB.
 */
export function compressImage(fileOrSrc: File | string, maxWidth = 500, maxHeight = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions preserving aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      // Compress to JPEG with 0.7 quality
      const base64 = canvas.toDataURL("image/jpeg", 0.7);
      resolve(base64);
    };
    
    img.onerror = (err) => {
      reject(err);
    };
    
    if (typeof fileOrSrc === "string") {
      img.src = fileOrSrc;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("File read error"));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrSrc);
    }
  });
}
