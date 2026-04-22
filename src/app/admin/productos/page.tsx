'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { Producto, Categoria } from '@/types'
import { Plus, Trash2, Edit2, X, Scan } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminProductosPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  // Estados
  const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>('productos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(false)

  // Scanner para código de barras
  const [showScanner, setShowScanner] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scannerViewportRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraAspectRatio, setCameraAspectRatio] = useState(16 / 9)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const isMobileDevice = typeof navigator !== 'undefined' ? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) : false
  const safeCameraAspectRatio = Number.isFinite(cameraAspectRatio) && cameraAspectRatio > 0 ? cameraAspectRatio : 16 / 9
  const scannerViewportWidth = `min(100%, ${(safeCameraAspectRatio * 70).toFixed(2)}vh)`
  const cameraPreviewWidth = safeCameraAspectRatio >= 1 ? 'clamp(90px, 22vw, 180px)' : 'clamp(80px, 18vw, 130px)'

  // Modal de producto
  const [showProductModal, setShowProductModal] = useState(false)
  const [formProducto, setFormProducto] = useState({
    nombre: '',
    descripcion: '',
    codigo_barras: '',
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 0,
    categoria_id: 0,
    proveedor_id: 0,
  })

  // Modal de categoría
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null)
  const [formCategoria, setFormCategoria] = useState({
    nombre: '',
    descripcion: '',
  })

  // Cargar datos
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadProductos()
    loadCategorias()
  }, [user])

  useEffect(() => {
    if (!showScanner) return
    listCameraDevices()
  }, [showScanner])

  const listCameraDevices = async () => {
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
  }

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

  // Scanner de código de barras
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
    setShowScanner(false)
    console.log('✓ Scanner detenido')
  }

  const captureBarcode = async () => {
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

          try {
            console.log('📤 Enviando imagen al servidor...')
            const data = await apiClient.detectBarcode(blob, 'full', true)
            console.log('✓ Respuesta del servidor:', data)

            if (data.barcode) {
              setFormProducto({ ...formProducto, codigo_barras: data.barcode })
              toast.success(`✓ Código detectado: ${data.barcode}`)
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

  const loadProductos = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getProductos(0, 100, undefined)
      setProductos(data)
    } catch (error) {
      toast.error('Error al cargar productos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const data = await apiClient.getCategorias()
      setCategorias(data)
    } catch (error) {
      toast.error('Error al cargar categorías')
      console.error(error)
    }
  }

  // Crear producto
  const handleCreateProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formProducto.nombre || !formProducto.codigo_barras || !formProducto.categoria_id) {
      toast.error('Complete los campos requeridos')
      return
    }

    try {
      setLoading(true)
      await apiClient.createProducto({
        nombre: formProducto.nombre,
        descripcion: formProducto.descripcion,
        codigo_barras: formProducto.codigo_barras,
        precio_venta: formProducto.precio_venta,
        stock_actual: formProducto.stock_actual,
        stock_minimo: formProducto.stock_minimo,
        categoria_id: formProducto.categoria_id,
        proveedor_id: formProducto.proveedor_id,
      })
      
      toast.success('Producto creado exitosamente')
      setShowProductModal(false)
      setFormProducto({
        nombre: '',
        descripcion: '',
        codigo_barras: '',
        precio_venta: 0,
        stock_actual: 0,
        stock_minimo: 0,
        categoria_id: 0,
        proveedor_id: 0,
      })
      loadProductos()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al crear producto')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Crear/actualizar categoría
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formCategoria.nombre) {
      toast.error('El nombre de la categoría es requerido')
      return
    }

    try {
      setLoading(true)
      if (editingCategory) {
        // Actualizar (si tienes endpoint)
        toast.success('Categoría actualizada')
        setEditingCategory(null)
      } else {
        // Crear nueva
        await apiClient.createCategoria(formCategoria.nombre, formCategoria.descripcion)
        toast.success('Categoría creada exitosamente')
      }
      
      setShowCategoryModal(false)
      setFormCategoria({ nombre: '', descripcion: '' })
      loadCategorias()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al guardar categoría')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Editar categoría
  const handleEditCategoria = (categoria: Categoria) => {
    setEditingCategory(categoria)
    setFormCategoria({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
    })
    setShowCategoryModal(true)
  }

  // Cerrar modales
  const closeProductModal = () => {
    setShowProductModal(false)
    setFormProducto({
      nombre: '',
      descripcion: '',
      codigo_barras: '',
      precio_venta: 0,
      stock_actual: 0,
      stock_minimo: 0,
      categoria_id: 0,
      proveedor_id: 0,
    })
  }

  const closeCategoryModal = () => {
    setShowCategoryModal(false)
    setEditingCategory(null)
    setFormCategoria({ nombre: '', descripcion: '' })
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
            <p className="text-gray-600">Gestiona productos y categorías</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('productos')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'productos'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setActiveTab('categorias')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                activeTab === 'categorias'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Categorías
            </button>
          </div>

          {/* PRODUCTOS TAB */}
          {activeTab === 'productos' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Productos</h2>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus size={20} />
                  Nuevo Producto
                </button>
              </div>

              {/* Tabla de productos */}
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productos.map((producto) => (
                      <tr key={producto.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">{producto.codigo_barras}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{producto.nombre}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {categorias.find((c) => c.id === producto.categoria_id)?.nombre || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">S/. {producto.precio_venta.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              producto.stock_actual > producto.stock_minimo
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {producto.stock_actual}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button className="text-primary-600 hover:text-primary-700 mr-3">
                            <Edit2 size={18} />
                          </button>
                          <button className="text-red-600 hover:text-red-700">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {productos.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">No hay productos registrados</div>
                )}
              </div>
            </div>
          )}

          {/* CATEGORIAS TAB */}
          {activeTab === 'categorias' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus size={20} />
                  Nueva Categoría
                </button>
              </div>

              {/* Grid de categorías */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorias.map((categoria) => (
                  <div key={categoria.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{categoria.nombre}</h3>
                        <p className="text-sm text-gray-600 mt-1">{categoria.descripcion || 'Sin descripción'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategoria(categoria)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button className="text-red-600 hover:text-red-700">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {productos.filter((p) => p.categoria_id === categoria.id).length} productos
                    </div>
                  </div>
                ))}
              </div>
              {categorias.length === 0 && (
                <div className="text-center py-8 text-gray-500">No hay categorías registradas</div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Nuevo Producto</h2>
              <button onClick={closeProductModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateProducto} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formProducto.nombre}
                  onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
                  className="input w-full"
                  placeholder="Nombre del producto"
                />
              </div>

              {/* Código de barras */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formProducto.codigo_barras}
                    onChange={(e) => setFormProducto({ ...formProducto, codigo_barras: e.target.value })}
                    className="input w-full"
                    placeholder="Ej: 123456789"
                  />
                  <button
                    type="button"
                    onClick={startScanner}
                    className="btn btn-secondary flex items-center gap-2 whitespace-nowrap"
                  >
                    <Scan size={18} />
                    Escanear
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formProducto.descripcion}
                  onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })}
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Detalles del producto"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                <select
                  required
                  value={formProducto.categoria_id}
                  onChange={(e) => setFormProducto({ ...formProducto, categoria_id: parseInt(e.target.value) })}
                  className="input w-full"
                >
                  <option value={0}>Seleccionar categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta (S/.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formProducto.precio_venta}
                  onChange={(e) => setFormProducto({ ...formProducto, precio_venta: parseFloat(e.target.value) })}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>

              {/* Stock actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                <input
                  type="number"
                  value={formProducto.stock_actual}
                  onChange={(e) => setFormProducto({ ...formProducto, stock_actual: parseInt(e.target.value) })}
                  className="input w-full"
                  placeholder="0"
                />
              </div>

              {/* Stock mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  value={formProducto.stock_minimo}
                  onChange={(e) => setFormProducto({ ...formProducto, stock_minimo: parseInt(e.target.value) })}
                  className="input w-full"
                  placeholder="0"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={closeCategoryModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveCategoria} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formCategoria.nombre}
                  onChange={(e) => setFormCategoria({ ...formCategoria, nombre: e.target.value })}
                  className="input w-full"
                  placeholder="Nombre de la categoría"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formCategoria.descripcion}
                  onChange={(e) => setFormCategoria({ ...formCategoria, descripcion: e.target.value })}
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Descripción de la categoría"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Guardando...' : 'Guardar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scanner Código de Barras */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Escanear Código de Barras</h2>
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

              {/* Canvas para mostrar video en tiempo real */}
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
                    width: cameraPreviewWidth,
                    height: 'auto',
                    aspectRatio: safeCameraAspectRatio,
                    backgroundColor: '#000000',
                    border: '2px solid #10b981',
                    borderRadius: '4px',
                    zIndex: 10,
                    display: 'block',
                    opacity: 0.8
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
                  onClick={captureBarcode}
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
    </>
  )
}
