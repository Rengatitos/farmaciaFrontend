'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useCarritoStore } from '@/stores/carritoStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Producto } from '@/types'
import { Search, Scan, ShoppingCart, X, Plus, Minus, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, preprocessBarcodeImageDataToBlob } from '@/lib/utils'

type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

function ProductosPageContent() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { addItem } = useCarritoStore()

  const [products, setProducts] = useState<Producto[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [selectedQuantity, setSelectedQuantity] = useState<{
    [key: number]: number
  }>({})
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const manualCanvasRef = useRef<HTMLCanvasElement>(null)
  const scannerViewportRef = useRef<HTMLDivElement>(null)
  const manualCropContainerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraAspectRatio, setCameraAspectRatio] = useState(16 / 9)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [manualCropMode, setManualCropMode] = useState(false)
  const [manualCropRect, setManualCropRect] = useState<CropRect | null>(null)
  const [isDrawingCrop, setIsDrawingCrop] = useState(false)
  const [cropStartPoint, setCropStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const [capturedFrameDataUrl, setCapturedFrameDataUrl] = useState<string | null>(null)
  const isMobileDevice = typeof navigator !== 'undefined' ? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) : false
  const safeCameraAspectRatio = Number.isFinite(cameraAspectRatio) && cameraAspectRatio > 0 ? cameraAspectRatio : 16 / 9
  const scannerViewportWidth = `min(100%, ${(safeCameraAspectRatio * 70).toFixed(2)}vh)`
  const cameraPreviewWidth = safeCameraAspectRatio >= 1 ? 'clamp(90px, 22vw, 180px)' : 'clamp(80px, 18vw, 130px)'

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getProductos(0, 100)
        setProducts(data)
        setFilteredProducts(data)
      } catch (error) {
        toast.error('Error al cargar productos')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [user, router])

  // Search Filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(products)
      return
    }

    const filtered = products.filter(
      (p) =>
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codigo_barras.includes(searchQuery) ||
        p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredProducts(filtered)
  }, [searchQuery, products])

  const listCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter((device) => device.kind === 'videoinput')
      setAvailableCameras(videoInputs)

      if (!selectedCameraId && videoInputs.length > 0) {
        const preferred = videoInputs.find((device) => /back|rear|trasera|environment/i.test(device.label))
        setSelectedCameraId(preferred?.deviceId || videoInputs[0].deviceId)
      }
    } catch (error) {
      console.error('No se pudieron listar cámaras', error)
    }
  }, [selectedCameraId])

  useEffect(() => {
    if (!showScanner) return
    listCameraDevices()
  }, [showScanner, listCameraDevices])

  useEffect(() => {
    if (!manualCropMode || manualCropRect || !manualCropContainerRef.current) return
    const rect = manualCropContainerRef.current.getBoundingClientRect()
    setManualCropRect({
      x: rect.width * 0.2,
      y: rect.height * 0.35,
      width: rect.width * 0.6,
      height: rect.height * 0.3,
    })
  }, [manualCropMode, manualCropRect])

  useEffect(() => {
    if (!manualCropMode || !capturedFrameDataUrl || !manualCanvasRef.current) return

    const img = new Image()
    img.onload = () => {
      if (!manualCanvasRef.current) return
      const canvas = manualCanvasRef.current
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      canvas.width = img.width
      canvas.height = img.height
      context.drawImage(img, 0, 0)
    }
    img.src = capturedFrameDataUrl
  }, [manualCropMode, capturedFrameDataUrl])

  const getVideoConstraints = () => {
    if (!isMobileDevice && selectedCameraId) {
      return {
        deviceId: { exact: selectedCameraId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      }
    }

    return {
      facingMode: { ideal: 'environment' as const },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    }
  }

  const handleCameraChange = (cameraId: string) => {
    setSelectedCameraId(cameraId)

    if (showScanner && streamRef.current) {
      stopScanner()
      setTimeout(() => {
        startScanner()
      }, 150)
    }
  }

  const resetManualCrop = () => {
    setManualCropMode(false)
    setManualCropRect(null)
    setIsDrawingCrop(false)
    setCropStartPoint(null)
    setProcessingCrop(false)
    setCapturedFrameDataUrl(null)
  }

  // Camera Scanner
  const startScanner = async () => {
    try {
      console.log('📷 Iniciando scanner de cámara...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: getVideoConstraints() })
      
      console.log('✓ Stream de cámara obtenido', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      })

      const videoTrack = stream.getVideoTracks()[0]
      const trackSettings = videoTrack?.getSettings()
      if (trackSettings?.width && trackSettings?.height) {
        setCameraAspectRatio(trackSettings.width / trackSettings.height)
      }
      
      streamRef.current = stream
      setShowScanner(true)
      resetManualCrop()
      
      // Pequeño delay para asegurar que el modal está renderizado
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          console.log('✓ Stream asignado al elemento video')
          
          // Escuchar cuando el video comience a reproducirse
          const handlePlay = () => {
            console.log('✓ Video iniciado. Dimensiones:', {
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight
            })
            videoRef.current?.removeEventListener('play', handlePlay)
            // Iniciar renderizado en canvas
            renderFrame()
          }
          
          const handleLoadedMetadata = () => {
            console.log('✓ Metadata de video cargado')
            if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              setCameraAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight)
            }
          }
          
          videoRef.current.addEventListener('play', handlePlay)
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
          
          // Reproducir video
          const playPromise = videoRef.current.play()
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error('✗ Error al reproducir video:', err.name, err.message)
              toast.error(`Error de cámara: ${err.name}`)
            })
          }
        }
      }, 100)
      
      toast.success('Cámara iniciada correctamente')
    } catch (error: any) {
      console.error('✗ Error de cámara:', error)
      
      let errorMessage = 'No se puede acceder a la cámara'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Verifica los permisos del navegador.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en este dispositivo'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación'
      } else if (error.name === 'SecurityError') {
        errorMessage = 'La cámara no está disponible (contexto inseguro). Usa HTTPS o localhost.'
      }
      
      toast.error(errorMessage)
    }
  }

  // Renderizar frames continuamente en canvas para preview
  const renderFrame = () => {
    if (!videoRef.current || !canvasRef.current || !showScanner) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const viewport = scannerViewportRef.current
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      console.error('✗ No se puede obtener contexto 2D del canvas')
      requestAnimationFrame(renderFrame)
      return
    }

    if (viewport) {
      const dpr = window.devicePixelRatio || 1
      const targetWidth = Math.max(1, Math.floor(viewport.clientWidth * dpr))
      const targetHeight = Math.max(1, Math.floor(viewport.clientHeight * dpr))

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
      }
    }

    try {
      // Verificar que el video está listo
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        // Limpiar canvas con fondo negro
        context.fillStyle = '#000000'
        context.fillRect(0, 0, canvas.width, canvas.height)
        
        // Calcular aspect ratio para mantener proporciones
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvas.width / canvas.height
        
        let drawWidth = canvas.width
        let drawHeight = canvas.height
        let drawX = 0
        let drawY = 0
        
        // Ajustar para mantener aspect ratio sin recortar (contain)
        if (videoAspect > canvasAspect) {
          drawHeight = canvas.width / videoAspect
          drawY = (canvas.height - drawHeight) / 2
        } else {
          drawWidth = canvas.height * videoAspect
          drawX = (canvas.width - drawWidth) / 2
        }
        
        // Dibujar video en canvas
        context.drawImage(video, drawX, drawY, drawWidth, drawHeight)
        console.log(`✓ Frame renderizado correctamente: video ${video.videoWidth}x${video.videoHeight} → canvas ${canvas.width}x${canvas.height}`)
      } else {
        // Video no está listo aún
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log(`⏳ Video no tiene dimensiones aún. readyState: ${video.readyState}`)
        }
      }
    } catch (error) {
      console.error('✗ Error dibujando frame en canvas:', error)
    }

    // Llamar nuevamente para siguiente frame (30-60 FPS)
    requestAnimationFrame(renderFrame)
  }

  const stopScanner = () => {
    console.log('🛑 Deteniendo scanner...')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log(`✓ Track ${track.kind} detenido`)
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    resetManualCrop()
    setShowScanner(false)
    console.log('✓ Scanner detenido')
  }

  const getPointerPosition = (clientX: number, clientY: number) => {
    if (!manualCropContainerRef.current) return null
    const rect = manualCropContainerRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(clientY - rect.top, rect.height)),
    }
  }

  const beginCropSelection = (x: number, y: number) => {
    const point = getPointerPosition(x, y)
    if (!point) return
    setCropStartPoint(point)
    setManualCropRect({ x: point.x, y: point.y, width: 0, height: 0 })
    setIsDrawingCrop(true)
  }

  const updateCropSelection = (x: number, y: number) => {
    if (!isDrawingCrop || !cropStartPoint) return
    const point = getPointerPosition(x, y)
    if (!point) return

    const rect: CropRect = {
      x: Math.min(cropStartPoint.x, point.x),
      y: Math.min(cropStartPoint.y, point.y),
      width: Math.abs(point.x - cropStartPoint.x),
      height: Math.abs(point.y - cropStartPoint.y),
    }
    setManualCropRect(rect)
  }

  const endCropSelection = () => {
    setIsDrawingCrop(false)
    setCropStartPoint(null)
  }

  const captureForManualCrop = async () => {
    if (!videoRef.current) return

    try {
      const video = videoRef.current

      console.log('📸 Capturando barcode...', {
        videoReady: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      })

      // Verificar que el video tiene contenido
      if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('✗ Video no está listo para captura', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        })
        toast.error('Espera a que el video se cargue completamente')
        return
      }

      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = video.videoWidth
      tempCanvas.height = video.videoHeight
      const tempContext = tempCanvas.getContext('2d', { willReadFrequently: true })

      if (!tempContext) {
        toast.error('No se pudo preparar el área de recorte')
        return
      }

      tempContext.drawImage(video, 0, 0)
      setCapturedFrameDataUrl(tempCanvas.toDataURL('image/png'))

      setManualCropMode(true)
      setManualCropRect(null)

      toast.success('Dibuja el área del código y luego procesa la imagen')
    } catch (error) {
      console.error('✗ Error al congelar frame:', error)
      toast.error('No se pudo congelar la imagen')
    }
  }

  const processManualCropAndScan = async () => {
    if (!manualCanvasRef.current || !manualCropContainerRef.current || !manualCropRect) {
      toast.error('Selecciona un área para recortar')
      return
    }

    if (manualCropRect.width < 20 || manualCropRect.height < 20) {
      toast.error('El recorte es muy pequeño. Selecciona un área mayor.')
      return
    }

    setProcessingCrop(true)

    try {
      const manualCanvas = manualCanvasRef.current
      const manualContext = manualCanvas.getContext('2d', { willReadFrequently: true })
      if (!manualContext) {
        toast.error('No se pudo leer la imagen recortada')
        return
      }

      const containerRect = manualCropContainerRef.current.getBoundingClientRect()
      const scaleX = manualCanvas.width / containerRect.width
      const scaleY = manualCanvas.height / containerRect.height

      const cropX = Math.max(0, Math.floor(manualCropRect.x * scaleX))
      const cropY = Math.max(0, Math.floor(manualCropRect.y * scaleY))
      const cropWidth = Math.max(1, Math.floor(manualCropRect.width * scaleX))
      const cropHeight = Math.max(1, Math.floor(manualCropRect.height * scaleY))

      const imageData = manualContext.getImageData(cropX, cropY, cropWidth, cropHeight)
      const blob = await preprocessBarcodeImageDataToBlob(imageData, {
        autoDetectRegion: true,
        marginRatio: 0.06,
        densityThreshold: 0.08,
        minComponentArea: 8,
      })

      if (!blob) {
        toast.error('No se pudo mejorar la imagen del código')
        return
      }

      console.log(`✓ Imagen recortada y mejorada: ${blob.size} bytes, type: ${blob.type}`)

      try {
        console.log('📤 Enviando imagen al servidor...')
        const data = await apiClient.detectBarcodeAndLookupProduct(blob, 'full', true, false)
        console.log('✓ Respuesta del servidor:', data)

        if (data.barcode) {
          toast.success(`✓ Código detectado: ${data.barcode}`)
          const product = data.product ?? products.find((p) => p.codigo_barras === data.barcode)
          if (product) {
            setSelectedQuantity({ [product.id]: 1 })
            toast.success(`Producto: ${product.nombre}`)
          } else {
            toast.error('Producto no encontrado')
          }
          stopScanner()
        } else {
          toast.error(data.message || 'No se detectó código de barras')
        }
      } catch (error) {
        console.error('✗ Error HTTP:', error)
        toast.error('Error al conectar con el servidor. ¿Está ejecutándose?')
      }
    } catch (error) {
      console.error('✗ Error al procesar recorte:', error)
      toast.error('Error al procesar imagen recortada')
    } finally {
      setProcessingCrop(false)
    }
  }

  const handleAddToCart = (product: Producto) => {
    const quantity = selectedQuantity[product.id] || 1
    if (product.stock_actual === 0) {
      toast.error(`${product.nombre} está agotado`)
      return
    }
    if (quantity > product.stock_actual) {
      toast.error(
        `Solo hay ${product.stock_actual} unidades de ${product.nombre}`
      )
      return
    }
    try {
      addItem(product, quantity)
      toast.success(`${product.nombre} agregado al carrito`)
      setSelectedQuantity((prev) => ({
        ...prev,
        [product.id]: 1,
      }))
    } catch (error) {
      toast.error('Error al agregar al carrito')
      console.error(error)
    }
  }

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    const product = products.find((p) => p.id === productId)
    if (product && newQuantity > product.stock_actual) return
    setSelectedQuantity((prev) => ({
      ...prev,
      [productId]: newQuantity,
    }))
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-2">
            Busca productos por nombre, descripción o código de barras
          </p>
        </div>

        {/* Search and Scanner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Search Bar */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, código de barras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Scanner Button */}
          <button
            onClick={startScanner}
            className="btn btn-secondary flex items-center justify-center gap-2 w-full"
          >
            <Scan size={18} />
            Escanear Código
          </button>
        </div>

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Escanear Código de Barras
                </h2>
                <button
                  onClick={stopScanner}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {/* Selector de cámara (más útil en desktop con webcam de celular) */}
                {availableCameras.length > 1 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cámara</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleCameraChange(e.target.value)}
                      className="input w-full"
                    >
                      {availableCameras.map((camera, idx) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label || `Cámara ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!manualCropMode ? (
                  <div
                    ref={scannerViewportRef}
                    className="relative bg-black rounded-lg overflow-hidden mb-4 mx-auto"
                    style={{
                      backgroundColor: '#000000',
                      width: scannerViewportWidth,
                      aspectRatio: safeCameraAspectRatio,
                      maxHeight: '70vh'
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000000',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        width: cameraPreviewWidth,
                        height: 'auto',
                        aspectRatio: safeCameraAspectRatio,
                        backgroundColor: '#000000',
                        border: '2px solid #5f63e7',
                        borderRadius: '4px',
                        zIndex: 10,
                        display: 'block',
                        opacity: 0.8
                      }}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Cámara Activa
                    </div>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-64 h-64 border-2 border-yellow-400 rounded" style={{ opacity: 0.5 }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={manualCropContainerRef}
                    className="relative bg-black rounded-lg overflow-hidden mb-4 mx-auto touch-none"
                    style={{
                      backgroundColor: '#000000',
                      width: scannerViewportWidth,
                      aspectRatio: safeCameraAspectRatio,
                      maxHeight: '70vh'
                    }}
                    onMouseDown={(e) => beginCropSelection(e.clientX, e.clientY)}
                    onMouseMove={(e) => updateCropSelection(e.clientX, e.clientY)}
                    onMouseUp={endCropSelection}
                    onMouseLeave={endCropSelection}
                    onTouchStart={(e) => {
                      const touch = e.touches[0]
                      if (touch) beginCropSelection(touch.clientX, touch.clientY)
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0]
                      if (touch) updateCropSelection(touch.clientX, touch.clientY)
                    }}
                    onTouchEnd={endCropSelection}
                  >
                    <canvas
                      ref={manualCanvasRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000000',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                    />
                    {manualCropRect && (
                      <div
                        className="absolute border-2 border-yellow-400 bg-yellow-300/10"
                        style={{
                          left: manualCropRect.x,
                          top: manualCropRect.y,
                          width: manualCropRect.width,
                          height: manualCropRect.height,
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Instrucciones:</strong>{' '}
                    {!manualCropMode
                      ? 'Primero congela el frame para recortar manualmente el área del código.'
                      : 'Dibuja el recorte sobre el código de barras, luego mejora la imagen y escanea.'}
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  {!manualCropMode ? (
                    <button
                      onClick={captureForManualCrop}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Scan size={20} />
                      Congelar para Recortar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={processManualCropAndScan}
                        disabled={processingCrop}
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <Scan size={20} />
                        {processingCrop ? 'Procesando...' : 'Mejorar y Escanear'}
                      </button>
                      <button
                        onClick={() => setManualCropMode(false)}
                        className="btn btn-secondary flex-1"
                      >
                        Volver a Cámara
                      </button>
                    </>
                  )}
                  <button
                    onClick={stopScanner}
                    className="btn btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="card overflow-hidden hover:shadow-subtle-lg transition-shadow">
                {/* Product Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 line-clamp-2">
                        {product.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Código: {product.codigo_barras}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Body */}
                <div className="p-6 space-y-3">
                  {product.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.descripcion}
                    </p>
                  )}

                  {/* Stock Status */}
                  <div className="flex items-center gap-2">
                    {product.stock_actual === 0 ? (
                      <span className="badge badge-danger">Agotado</span>
                    ) : product.stock_actual <= product.stock_minimo ? (
                      <span className="badge badge-warning">Bajo Stock</span>
                    ) : (
                      <span className="badge badge-success">En Stock</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {product.stock_actual} disponibles
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-2xl font-bold text-primary-600">
                    {formatCurrency(product.precio_venta)}
                  </div>

                  {/* Quantity Selector */}
                  {product.stock_actual > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            product.id,
                            (selectedQuantity[product.id] || 1) - 1
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Minus size={18} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.stock_actual}
                        value={selectedQuantity[product.id] || 1}
                        onChange={(e) =>
                          updateQuantity(
                            product.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="input text-center w-16 py-1"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(
                            product.id,
                            (selectedQuantity[product.id] || 1) + 1
                          )
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Add to Cart Button */}
                <div className="p-6 border-t border-gray-100">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock_actual === 0}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart size={18} />
                    {product.stock_actual > 0 ? 'Agregar al Carrito' : 'Agotado'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-600">
              Intenta con otro término de búsqueda
            </p>
          </div>
        )}
      </main>
    </>
  )
}

export default function ProductosPage() {
  return <ProductosPageContent />
}
