const MAX_TOTAL_BYTES = 1024 * 1024
const MAX_FILES = 2
const MAX_EDGE_PX = 1400

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read image: ${file.name}`))
    }
    img.src = url
  })

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression failed.'))
          return
        }
        resolve(blob)
      },
      type,
      quality,
    )
  })

const compressOne = async (file) => {
  const img = await loadImage(file)
  let width = img.naturalWidth
  let height = img.naturalHeight

  if (width > MAX_EDGE_PX || height > MAX_EDGE_PX) {
    const scale = MAX_EDGE_PX / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not available in this browser.')
  }
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.82
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)

  while (blob.size > MAX_TOTAL_BYTES / 2 && quality > 0.45) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  while (blob.size > MAX_TOTAL_BYTES / 2 && width > 640) {
    width = Math.round(width * 0.85)
    height = Math.round(height * 0.85)
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, 0, 0, width, height)
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'diary'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

/**
 * Compress 1–2 diary images client-side. Throws if combined size still exceeds 1 MB.
 * @param {FileList|File[]} input
 * @returns {Promise<File[]>}
 */
export const compressDiaryImages = async (input) => {
  const picked = Array.from(input || []).slice(0, MAX_FILES)
  if (picked.length === 0) {
    throw new Error('Choose at least one image.')
  }
  if (picked.length > MAX_FILES) {
    throw new Error(`Maximum ${MAX_FILES} images allowed.`)
  }

  for (const file of picked) {
    if (!file.type?.startsWith('image/')) {
      throw new Error('Only image files are allowed.')
    }
  }

  const compressed = await Promise.all(picked.map(compressOne))
  const total = compressed.reduce((sum, file) => sum + file.size, 0)

  if (total > MAX_TOTAL_BYTES) {
    const mb = (total / MAX_TOTAL_BYTES).toFixed(2)
    throw new Error(
      `Combined size is ${mb} MB after optimization. Please use smaller or fewer images (max 1 MB total).`,
    )
  }

  return compressed
}

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
