import { extractPosterPalette } from '../poster-colors'

// Shared between both walls for this browser session; URLs include media revisions.
const paletteCache = new Map()
function readPalette(url) {
  if (paletteCache.has(url)) return paletteCache.get(url)
  const promise = new Promise(resolve => {
    const image = new Image()
    let settled = false
    const finish = value => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      image.onload = null
      image.onerror = null
      if (!value) paletteCache.delete(url)
      resolve(value)
    }
    const timer = setTimeout(() => { finish(null); image.src = '' }, 20000)
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 48
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return finish(null)
        context.drawImage(image, 0, 0, 48, 48)
        finish(extractPosterPalette(context.getImageData(0, 0, 48, 48).data))
      } catch { finish(null) }
    }
    image.onerror = () => finish(null)
    image.crossOrigin = 'anonymous'
    image.src = url
  })
  if (paletteCache.size > 1200) paletteCache.clear()
  paletteCache.set(url, promise)
  return promise
}

export async function loadPosterPalettes(posters, assetBase, onProgress, isCancelled) {
  const palettes = new Map()
  let cursor = 0, completed = 0, failed = 0
  const worker = async () => {
    while (cursor < posters.length && !isCancelled()) {
      const poster = posters[cursor++]
      const path = poster.imagePath.startsWith('/') || /^https:\/\//i.test(poster.imagePath)
        ? poster.imagePath : `${assetBase.replace(/\/$/, '')}/${poster.imagePath}`
      const imageUrl = new URL(path, location.origin)
      // Public historical R2 has no CORS permission. A whitelist-backed same-origin
      // image route supports Canvas without opening an arbitrary URL proxy.
      const url = imageUrl.origin === location.origin ? imageUrl.href
        : `/media/poster-colors/${encodeURIComponent(poster.id)}`
      const palette = await readPalette(url)
      if (isCancelled()) return
      palettes.set(poster.id, palette)
      completed++
      if (!palette) failed++
      onProgress({ completed, failed, total: posters.length })
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, posters.length) }, worker))
  return palettes
}
