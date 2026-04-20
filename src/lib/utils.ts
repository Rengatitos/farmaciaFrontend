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
