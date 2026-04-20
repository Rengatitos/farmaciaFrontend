'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useCarritoStore } from '@/stores/carritoStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Producto } from '@/types'
import { Search, Scan, ShoppingCart, X, Plus, Minus, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

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
  const streamRef = useRef<MediaStream | null>(null)

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

  // Camera Scanner
  const startScanner = async () => {
    try {
      console.log('📷 Iniciando scanner de cámara...')
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      
      console.log('✓ Stream de cámara obtenido', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      })
      
      streamRef.current = stream
      setShowScanner(true)
      
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
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      console.error('✗ No se puede obtener contexto 2D del canvas')
      requestAnimationFrame(renderFrame)
      return
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
        
        // Ajustar para mantener aspect ratio
        if (videoAspect > canvasAspect) {
          drawWidth = canvas.height * videoAspect
          drawX = (canvas.width - drawWidth) / 2
        } else {
          drawHeight = canvas.width / videoAspect
          drawY = (canvas.height - drawHeight) / 2
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
    setShowScanner(false)
    console.log('✓ Scanner detenido')
  }

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) {
        console.error('✗ No se puede obtener contexto 2D')
        toast.error('Error: sin contexto de canvas')
        return
      }

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

      // Configurar canvas con las dimensiones del video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Dibujar video en canvas
      try {
        context.drawImage(video, 0, 0)
        console.log(`✓ Frame capturado: ${canvas.width}x${canvas.height}`)
      } catch (drawError) {
        console.error('✗ Error al dibujar video en canvas:', drawError)
        toast.error('Error al capturar frame del video')
        return
      }

      // Convertir canvas a blob y enviar al servidor
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            console.error('✗ No se pudo generar blob de imagen')
            toast.error('Error al generar imagen')
            return
          }

          console.log(`✓ Blob generado: ${blob.size} bytes, type: ${blob.type}`)

          const formData = new FormData()
          formData.append('image', blob, 'barcode.jpg')

          try {
            console.log('📤 Enviando imagen al servidor...')
            const response = await fetch('http://localhost:8000/api/scanner/detect', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              console.error(`✗ Respuesta del servidor: ${response.status} ${response.statusText}`)
              toast.error(`Error del servidor: ${response.statusText}`)
              return
            }

            const data = await response.json()
            console.log('✓ Respuesta del servidor:', data)

            if (data.barcode) {
              toast.success(`✓ Código detectado: ${data.barcode}`)
              // Buscar producto
              const product = products.find((p) => p.codigo_barras === data.barcode)
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
        },
        'image/jpeg',
        0.9
      )
    } catch (error) {
      console.error('✗ Error general al capturar:', error)
      toast.error('Error al capturar barcode')
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
                {/* Video element - pequeño para que el navegador capture correctamente */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '100px',
                    height: '75px',
                    backgroundColor: '#000000',
                    border: '2px solid #10b981',
                    borderRadius: '4px',
                    zIndex: 10,
                    display: 'block',
                    opacity: 0.8
                  }}
                />

                {/* Canvas para mostrar video en tiempo real */}
                <div className="relative bg-black rounded-lg overflow-hidden mb-4 w-full" style={{ height: '400px', backgroundColor: '#000000' }}>
                  <canvas
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#000000',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                  {/* Indicador de cámara activa */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Cámara Activa
                  </div>
                  {/* Reticle para enfoque */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-64 h-64 border-2 border-yellow-400 rounded" style={{ opacity: 0.5 }}></div>
                    </div>
                  </div>
                </div>

                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Instrucciones:</strong> Posiciona el código de barras dentro del cuadro de video. 
                    Asegúrate de que esté bien iluminado y enfocado antes de capturar.
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                  <button
                    onClick={captureAndScan}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Scan size={20} />
                    Capturar Código
                  </button>
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
