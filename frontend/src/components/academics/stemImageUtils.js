/** Client-side limits for question structure images (matric / O-level diagrams). */
export const STEM_IMAGE_MAX_EDGE = 1200
export const STEM_IMAGE_MAX_CHARS = 700_000
export const STEM_IMAGE_JPEG_QUALITY = 0.82

export function stemImageSrc(value) {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('data:')) return trimmed
  return `data:image/jpeg;base64,${trimmed}`
}

/**
 * Resize + JPEG-compress a File to a data URL under STEM_IMAGE_MAX_CHARS.
 * @returns {Promise<string>}
 */
export function compressStemImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose a PNG, JPEG, or WebP image.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read that image.'))
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) {
        reject(new Error('Unable to read that image.'))
        return
      }

      const image = new Image()
      image.onload = () => {
        const longest = Math.max(image.width, image.height) || 1
        const scale = longest > STEM_IMAGE_MAX_EDGE ? STEM_IMAGE_MAX_EDGE / longest : 1
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Unable to process that image.'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(image, 0, 0, width, height)

        let quality = STEM_IMAGE_JPEG_QUALITY
        let result = canvas.toDataURL('image/jpeg', quality)
        while (result.length > STEM_IMAGE_MAX_CHARS && quality > 0.45) {
          quality -= 0.08
          result = canvas.toDataURL('image/jpeg', quality)
        }

        if (result.length > STEM_IMAGE_MAX_CHARS) {
          reject(new Error('Image is too large. Try a clearer smaller photo.'))
          return
        }
        resolve(result)
      }
      image.onerror = () => reject(new Error('Unable to process that image.'))
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}
