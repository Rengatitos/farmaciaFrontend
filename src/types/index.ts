// Autenticación
export interface User {
  id: string
  nombre: string
  email: string
  rol: 'admin' | 'vendedor'
  telefono?: string
  estado: boolean
  fecha_creacion: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// Productos
export interface Producto {
  id: number
  codigo_barras: string
  nombre: string
  descripcion?: string
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  categoria_id: number
  proveedor_id?: number
  activo: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface ProductoCreateRequest {
  codigo_barras: string
  nombre: string
  descripcion?: string
  precio_venta: number
  stock_actual: number
  stock_minimo: number
  categoria_id: number
  proveedor_id?: number
}

export interface Categoria {
  id: number
  nombre: string
  descripcion?: string
  fecha_creacion: string
}

export interface ScannerDetectResponse {
  success: boolean
  barcode: string | null
  type?: string | null
  message?: string
  method_used?: 'full' | 'fast' | string
}

export interface ScannerDetectProductResponse extends ScannerDetectResponse {
  product?: Producto | null
}

// Ventas
export interface DetalleVenta {
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Venta {
  id: number
  numero_boleta: string
  fecha: string
  vendedor_id: string
  metodo_pago: 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'
  documento_cliente?: string
  nombre_cliente?: string
  total: number
  estado: 'completada'
  detalles: DetalleVenta[]
}

export interface CrearVentaRequest {
  metodo_pago: 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'
  documento_cliente?: string
  nombre_cliente?: string
  detalles: DetalleVenta[]
}

// Analytics
export interface DashboardResumen {
  total_ventas_hoy: number
  total_ingreso_hoy: number
  productos_bajo_stock: number
  total_productos: number
  metodo_pago_favorito: string
  producto_mas_vendido: string
  promedio_venta_hoy: number
}

export interface VentasPorMetodo {
  [key: string]: {
    cantidad: number
    total: number
  }
}

export interface Prediccion {
  producto_id: number
  nombre_producto: string
  prediccion_cantidad: number
  confianza: number
}

// Reportes
export interface ReporteAnalisis {
  periodo: string
  total_ventas: number
  total_ingreso: number
  productos_vendidos: number
  producto_mas_vendido: string
  metodo_pago_favorito: string
  analisis_ia: string
  recomendaciones: string
}

// Carrito
export interface CarritoItem {
  id: string
  producto: Producto
  cantidad: number
  subtotal: number
}
