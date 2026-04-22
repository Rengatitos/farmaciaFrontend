export const formatCurrency = (amount: number): string => {
  return `S/. ${amount.toFixed(2)}`
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const generateBoleNumber = (): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `BOL-${timestamp}-${random}`
}

export const detectBarcodeFromCanvas = async (
  canvas: HTMLCanvasElement
): Promise<string | null> => {
  try {
    const imageData = canvas.getContext('2d')?.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    )
    if (!imageData) return null

    // Dinamically import jsQR
    const jsQR = (await import('jsqr')).default
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      return code.data
    }
    return null
  } catch (error) {
    console.error('Error detecting barcode:', error)
    return null
  }
}

export interface BarcodePreprocessOptions {
  maxWidth?: number
  densityThreshold?: number
  marginRatio?: number
  minComponentArea?: number
}

type ComponentBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

const calculateOtsuThreshold = (gray: Uint8Array): number => {
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i += 1) {
    histogram[gray[i]] += 1
  }

  let total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i += 1) {
    sum += i * histogram[i]
  }

  let sumB = 0
  let wB = 0
  let wF = 0
  let maxVariance = 0
  let threshold = 128

  for (let i = 0; i < 256; i += 1) {
    wB += histogram[i]
    if (wB === 0) continue

    wF = total - wB
    if (wF === 0) break

    sumB += i * histogram[i]

    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const betweenClassVariance = wB * wF * (mB - mF) * (mB - mF)

    if (betweenClassVariance > maxVariance) {
      maxVariance = betweenClassVariance
      threshold = i
    }
  }

  return threshold
}

const findLongestDenseBand = (
  rowCounts: Uint32Array,
  width: number,
  densityThreshold: number
): { start: number; end: number } | null => {
  let bestStart = -1
  let bestEnd = -1
  let currentStart = -1

  for (let y = 0; y < rowCounts.length; y += 1) {
    const density = rowCounts[y] / width
    const isDense = density >= densityThreshold

    if (isDense && currentStart === -1) {
      currentStart = y
    }

    if (!isDense && currentStart !== -1) {
      if (bestStart === -1 || y - 1 - currentStart > bestEnd - bestStart) {
        bestStart = currentStart
        bestEnd = y - 1
      }
      currentStart = -1
    }
  }

  if (currentStart !== -1) {
    if (bestStart === -1 || rowCounts.length - 1 - currentStart > bestEnd - bestStart) {
      bestStart = currentStart
      bestEnd = rowCounts.length - 1
    }
  }

  if (bestStart === -1 || bestEnd === -1) return null

  return { start: bestStart, end: bestEnd }
}

const findConnectedComponents = (
  darkMask: Uint8Array,
  width: number,
  height: number,
  band: { start: number; end: number },
  minComponentArea: number
): ComponentBounds[] => {
  const visited = new Uint8Array(darkMask.length)
  const components: ComponentBounds[] = []
  const stack: number[] = []

  for (let y = band.start; y <= band.end; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x
      if (!darkMask[startIndex] || visited[startIndex]) continue

      visited[startIndex] = 1
      stack.length = 0
      stack.push(startIndex)

      let area = 0
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y

      while (stack.length > 0) {
        const index = stack.pop() as number
        const currentY = Math.floor(index / width)
        const currentX = index % width

        area += 1
        minX = Math.min(minX, currentX)
        maxX = Math.max(maxX, currentX)
        minY = Math.min(minY, currentY)
        maxY = Math.max(maxY, currentY)

        const neighbors = [
          index - 1,
          index + 1,
          index - width,
          index + width,
        ]

        for (const neighbor of neighbors) {
          if (neighbor < 0 || neighbor >= darkMask.length) continue

          const neighborY = Math.floor(neighbor / width)
          if (neighborY < band.start || neighborY > band.end) continue

          if (darkMask[neighbor] && !visited[neighbor]) {
            visited[neighbor] = 1
            stack.push(neighbor)
          }
        }
      }

      if (area >= minComponentArea) {
        components.push({ minX, minY, maxX, maxY, area })
      }
    }
  }

  return components
}

const mergeComponentBounds = (
  components: ComponentBounds[],
  width: number,
  height: number,
  marginRatio: number
): { x: number; y: number; width: number; height: number } | null => {
  if (components.length === 0) return null

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (const component of components) {
    minX = Math.min(minX, component.minX)
    minY = Math.min(minY, component.minY)
    maxX = Math.max(maxX, component.maxX)
    maxY = Math.max(maxY, component.maxY)
  }

  const boxWidth = Math.max(1, maxX - minX + 1)
  const boxHeight = Math.max(1, maxY - minY + 1)
  const marginX = Math.max(4, Math.floor(boxWidth * marginRatio))
  const marginY = Math.max(4, Math.floor(boxHeight * marginRatio))

  return {
    x: clamp(minX - marginX, 0, width - 1),
    y: clamp(minY - marginY, 0, height - 1),
    width: clamp(boxWidth + marginX * 2, 1, width),
    height: clamp(boxHeight + marginY * 2, 1, height),
  }
}

export const preprocessBarcodeFrameToBlob = async (
  video: HTMLVideoElement,
  options: BarcodePreprocessOptions = {}
): Promise<Blob | null> => {
  if (!video.videoWidth || !video.videoHeight) return null

  const maxWidth = options.maxWidth ?? 720
  const marginRatio = options.marginRatio ?? 0.12
  const densityThreshold = options.densityThreshold ?? 0.1
  const minComponentArea = options.minComponentArea ?? 12

  const scale = Math.min(1, maxWidth / video.videoWidth)
  const sourceWidth = Math.max(1, Math.round(video.videoWidth * scale))
  const sourceHeight = Math.max(1, Math.round(video.videoHeight * scale))

  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = sourceWidth
  sourceCanvas.height = sourceHeight

  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) return null

  sourceContext.drawImage(video, 0, 0, sourceWidth, sourceHeight)
  const sourceImageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight)
  const rgba = sourceImageData.data

  const grayscale = new Uint8Array(sourceWidth * sourceHeight)
  const darkMask = new Uint8Array(sourceWidth * sourceHeight)
  const rowCounts = new Uint32Array(sourceHeight)

  for (let i = 0, pixelIndex = 0; i < rgba.length; i += 4, pixelIndex += 1) {
    const luminance = Math.round(
      rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114
    )
    grayscale[pixelIndex] = luminance
  }

  const threshold = calculateOtsuThreshold(grayscale)

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const index = y * sourceWidth + x
      const isDark = grayscale[index] <= threshold
      darkMask[index] = isDark ? 1 : 0
      if (isDark) rowCounts[y] += 1
    }
  }

  const averageDensity = rowCounts.reduce((sum, count) => sum + count / sourceWidth, 0) / sourceHeight
  const bandThreshold = Math.max(densityThreshold, averageDensity + 0.02)
  const denseBand = findLongestDenseBand(rowCounts, sourceWidth, bandThreshold)

  const band = denseBand ?? {
    start: Math.max(0, Math.floor(sourceHeight * 0.2)),
    end: Math.min(sourceHeight - 1, Math.floor(sourceHeight * 0.8)),
  }

  const components = findConnectedComponents(
    darkMask,
    sourceWidth,
    sourceHeight,
    band,
    minComponentArea
  )

  const cropBounds = mergeComponentBounds(
    components.length > 0 ? components : [{ minX: 0, minY: band.start, maxX: sourceWidth - 1, maxY: band.end, area: sourceWidth * (band.end - band.start + 1) }],
    sourceWidth,
    sourceHeight,
    marginRatio
  )

  const targetX = cropBounds?.x ?? 0
  const targetY = cropBounds?.y ?? 0
  const targetWidth = cropBounds?.width ?? sourceWidth
  const targetHeight = cropBounds?.height ?? sourceHeight

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = targetWidth
  outputCanvas.height = targetHeight

  const outputContext = outputCanvas.getContext('2d', { willReadFrequently: true })
  if (!outputContext) return null

  const croppedImageData = sourceContext.getImageData(targetX, targetY, targetWidth, targetHeight)
  const croppedData = croppedImageData.data

  for (let i = 0; i < croppedData.length; i += 4) {
    const luminance = Math.round(
      croppedData[i] * 0.299 + croppedData[i + 1] * 0.587 + croppedData[i + 2] * 0.114
    )
    const binaryValue = luminance <= threshold ? 0 : 255
    croppedData[i] = binaryValue
    croppedData[i + 1] = binaryValue
    croppedData[i + 2] = binaryValue
    croppedData[i + 3] = 255
  }

  outputContext.putImageData(croppedImageData, 0, 0)

  return await new Promise<Blob | null>((resolve) => {
    outputCanvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png')
  })
}

export const downloadFile = (content: Blob, filename: string) => {
  const url = window.URL.createObjectURL(content)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const getPaymentMethodIcon = (
  method: 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'
): string => {
  const icons = {
    Efectivo: '💵',
    Yape: '📱',
    Plin: '📱',
    Tarjeta: '💳',
  }
  return icons[method] || '💳'
}

export const getPaymentMethodLabel = (
  method: 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'
): string => {
  const labels = {
    Efectivo: 'Efectivo',
    Yape: 'Yape',
    Plin: 'Plin',
    Tarjeta: 'Tarjeta Crédito/Débito',
  }
  return labels[method] || method
}

export const getProductStatusColor = (
  stock: number,
  stockMinimo: number
): string => {
  if (stock === 0) return 'danger'
  if (stock <= stockMinimo) return 'warning'
  return 'success'
}

export const getProductStatusLabel = (
  stock: number,
  stockMinimo: number
): string => {
  if (stock === 0) return 'Agotado'
  if (stock <= stockMinimo) return 'Bajo Stock'
  return 'En Stock'
}
