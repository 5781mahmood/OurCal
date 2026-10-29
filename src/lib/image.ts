/**
 * Resize + compress an image file to a square-ish data URL for avatars.
 * Avoids "photo too large" dead ends for normal phone photos.
 */
export function compressImageFile(
  file: File,
  maxEdge = 512,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file (JPEG, PNG, or WebP).'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process that photo.'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      let data = canvas.toDataURL('image/jpeg', quality)
      // If still huge (rare), compress harder.
      if (data.length > 180_000) {
        data = canvas.toDataURL('image/jpeg', 0.65)
      }
      resolve(data)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo. Try another file.'))
    }
    img.src = url
  })
}
