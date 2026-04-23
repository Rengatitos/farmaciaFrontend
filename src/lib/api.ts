import axios, { AxiosInstance } from 'axios'
import {
  User,
  AuthResponse,
  Producto,
  ProductoCreateRequest,
  Categoria,
  Venta,
  CrearVentaRequest,
  DashboardResumen,
  Prediccion,
  ReporteAnalisis,
  ScannerDetectResponse,
  ScannerDetectProductResponse,
  InfoFarmaco,
  GuardarInfoFarmacoResponse,
  AdminRegisterUserRequest,
  AdminUsersResponse,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://farmaciabackend-5843.onrender.com'

class ApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Interceptor para agregar el token a cada request
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    // Cargar token del localStorage si existe
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token')
    }
  }

  setToken(token: string) {
    this.token = token
    localStorage.setItem('access_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('access_token')
  }

  // AUTH ENDPOINTS
  async login(email: string, password: string) {
    const response = await this.client.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
    return response.data
  }

  async getMe() {
    const response = await this.client.get<User>('/auth/me')
    return response.data
  }

  async getUsuariosAdmin() {
    const response = await this.client.get<AdminUsersResponse>('/auth/usuarios')
    return response.data
  }

  async registerUsuarioAdmin(payload: AdminRegisterUserRequest) {
    const response = await this.client.post('/auth/admin/register', payload)
    return response.data
  }

  // PRODUCTOS ENDPOINTS
  async getProductos(skip = 0, limit = 50, activo?: boolean) {
    const response = await this.client.get<Producto[]>('/productos', {
      params: { skip, limit, activo },
    })
    return response.data
  }

  async getProductoByBarcode(barcode: string) {
    const response = await this.client.get<Producto>(
      `/productos/${barcode}`
    )
    return response.data
  }

  async createProducto(producto: ProductoCreateRequest) {
    const response = await this.client.post<Producto>('/productos', producto)
    return response.data
  }

  ////put /productos/{producto_id} Actualizar Producto

  async updateProducto(productoId: number, producto: Partial<ProductoCreateRequest>) {
    const response = await this.client.put<Producto>(`/productos/${productoId}`, producto)
    return response.data
  }
  ////delete /productos/{producto_id} Eliminar Producto (lógica de eliminación suave, solo cambia el estado a inactivo)
  async deleteProducto(productoId: number) {
    const response = await this.client.delete(`/productos/${productoId}`)
    return response.data
  }

  async restoreProducto(productoId: number) {
    const response = await this.client.post(`/productos/${productoId}/restaurar`)
    return response.data
  }

  


  async getCategorias() {
    const response = await this.client.get<Categoria[]>('/productos/categorias')
    return response.data
  }

  async createCategoria(nombre: string, descripcion?: string) {
    const response = await this.client.post<Categoria>('/productos/categorias', {
      nombre,
      descripcion,
    })
    return response.data
  }

  async leerBarcodeSolo(imageBlob: Blob, method: 'full' | 'fast' = 'full', crop = true) {
    const formData = new FormData()
    formData.append('archivo', imageBlob, 'barcode.jpg')

    const response = await this.client.post('/productos/leer-barcode-solo', formData, {
      params: { method, crop },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async leerBarcodeInformacion(imageBlob: Blob, method: 'full' | 'fast' = 'full', crop = true) {
    const formData = new FormData()
    formData.append('archivo', imageBlob, 'barcode.jpg')

    const response = await this.client.post('/productos/leer-barcode-informacion', formData, {
      params: { method, crop },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async leerMultiplesBarcodes(imageBlob: Blob, method: 'full' | 'fast' = 'full', crop = true) {
    const formData = new FormData()
    formData.append('archivo', imageBlob, 'barcode.jpg')

    const response = await this.client.post('/productos/leer-multiples-barcodes', formData, {
      params: { method, crop },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async buscarInfoFarmaco(nombreFarmaco: string) {
    const response = await this.client.post<InfoFarmaco>('/scraping/sync/' + encodeURIComponent(nombreFarmaco))
    return response.data
  }

  async guardarInfoFarmaco(nombreFarmaco: string, productoId: number) {
    const response = await this.client.post<GuardarInfoFarmacoResponse>('/scraping/guardar-informacion', null, {
      params: { nombre_farmaco: nombreFarmaco, producto_id: productoId },
    })
    return response.data
  }

  // VENTAS ENDPOINTS
  async createVenta(venta: CrearVentaRequest) {
    const response = await this.client.post<Venta>('/ventas/boleta', venta)
    return response.data
  }

  async getVentas(skip = 0, limit = 50) {
    const response = await this.client.get<Venta[]>('/ventas', {
      params: { skip, limit },
    })
    return response.data
  }

  async getVenta(ventaId: number) {
    const response = await this.client.get<Venta>(`/ventas/${ventaId}`)
    return response.data
  }

  async getProductosBajoStock() {
    const response = await this.client.get<Producto[]>('/ventas/stock/bajo-stock')
    return response.data
  }

  // ANALYTICS ENDPOINTS
  async getDashboardResumen() {
    const response = await this.client.get<DashboardResumen>(
      '/analytics/dashboard/resumen'
    )
    return response.data
  }

  async getPredicciones(mes?: number, año?: number) {
    if (mes && año) {
      const response = await this.client.get<Prediccion[]>(
        `/analytics/predicciones/${mes}/${año}`
      )
      return response.data
    }
    const response = await this.client.get<Prediccion[]>(
      '/analytics/prediccion'
    )
    return response.data
  }

  async getVentasPorMetodo() {
    const response = await this.client.get('/analytics/ventas/por-metodo')
    return response.data
  }

  // REPORTES ENDPOINTS
  async getReporteMonthly(mes?: number, anio?: number) {
    const response = await this.client.get<ReporteAnalisis>('/reports/monthly', {
      params: { mes, anio },
    })
    return response.data
  }

  async sendReporteMonthlyEmail(mes?: number, anio?: number, emailDestino?: string) {
    const response = await this.client.post('/reports/monthly/send-email', null, {
      params: { mes, anio, email_destino: emailDestino },
    })
    return response.data
  }

  async getAnalisisVentas(mes?: number, anio?: number) {
    const response = await this.client.get<string>('/reports/analisis-ventas', {
      params: { mes, anio },
    })
    return response.data
  }

  async downloadComprasCSV(mes?: number, anio?: number) {
    const response = await this.client.get('/reports/descargar/compras', {
      params: { mes, anio },
      responseType: 'blob',
    })
    return response.data
  }

  async downloadVentasCSV(mes?: number, anio?: number) {
    const response = await this.client.get('/reports/descargar/ventas', {
      params: { mes, anio },
      responseType: 'blob',
    })
    return response.data
  }

  async getChatbotResponse(pregunta: string) {
    const response = await this.client.get<{ respuesta: string }>(
      '/reports/chatbot',
      { params: { pregunta } }
    )
    return response.data
  }

  // SCANNER ENDPOINTS
  async detectBarcode(imageBlob: Blob, method: 'full' | 'fast' = 'full', crop = true) {
    const formData = new FormData()
    formData.append('image', imageBlob, 'barcode.jpg')

    const response = await this.client.post<ScannerDetectResponse>('/api/scanner/detect', formData, {
      params: { method, crop },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  async detectBarcodeAndLookupProduct(
    imageBlob: Blob,
    method: 'full' | 'fast' = 'full',
    crop = true,
    includeInactive = false
  ) {
    const formData = new FormData()
    formData.append('image', imageBlob, 'barcode.jpg')

    const response = await this.client.post<ScannerDetectProductResponse>(
      '/api/scanner/detect-product',
      formData,
      {
        params: { method, crop, include_inactive: includeInactive },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }
}

export const apiClient = new ApiClient()
