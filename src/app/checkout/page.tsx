'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useCarritoStore } from '@/stores/carritoStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import { formatCurrency, generateBoleNumber, formatDateTime } from '@/lib/utils'
import { Trash2, ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const {
    items,
    removeItem,
    updateQuantity,
    clear,
    getTotal,
  } = useCarritoStore()

  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<
    'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'
  >('Efectivo')
  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    documento: '',
  })
  const [venta, setVenta] = useState<any>(null)
  const [boleNumber] = useState(generateBoleNumber())

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user) return null

  const totalConIgv = getTotal()
  const subtotalSinIgv = totalConIgv / 1.18
  const montoIgv = totalConIgv - subtotalSinIgv

  const handleRemoveItem = (id: string) => {
    removeItem(id)
    toast.success('Producto removido del carrito')
  }

  const handleCreateVenta = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    try {
      setLoading(true)

      const detallesBoleta = items.map((item) => ({
        producto_id: item.producto.id,
        nombre_producto: item.producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_venta,
        subtotal: item.subtotal,
      }))

      const ventaData = {
        metodo_pago: paymentMethod,
        documento_cliente: customerInfo.documento || undefined,
        nombre_cliente: customerInfo.nombre || undefined,
        detalles: detallesBoleta.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        })),
      }

      const response = await apiClient.createVenta(ventaData)
      setVenta({
        ...response,
        nombre_cliente: response?.nombre_cliente || customerInfo.nombre || undefined,
        documento_cliente: response?.documento_cliente || customerInfo.documento || undefined,
        detalles: detallesBoleta,
      })
      toast.success('¡Venta registrada exitosamente!')
    } catch (error: any) {
      const message =
        error.response?.data?.detail || 'Error al crear la venta'
      toast.error(message)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBoleta = async () => {
    try {
      const element = document.getElementById('boleta-print')
      if (!element) return

      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`boleta-${venta?.numero_boleta}.pdf`)
      toast.success('Boleta descargada exitosamente')
    } catch (error) {
      toast.error('Error al descargar la boleta')
    }
  }

  const handleFinishSale = () => {
    clear()
    setVenta(null)
    setCustomerInfo({ nombre: '', documento: '' })
    setPaymentMethod('Efectivo')
    router.push('/productos')
  }

  // Venta completada
  if (venta) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Boleta */}
          <div id="boleta-print" className="card p-8 mb-8">
            <div className="text-center mb-8 pb-8 border-b-2 border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900">Farmacia Sara</h1>
              <p className="text-gray-600">RUC: 20123456789</p>
              <p className="text-gray-600">Jr. Principal 123, Lima</p>
            </div>

            {/* Boleta Header */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <p className="text-sm text-gray-600">Número de Boleta</p>
                <p className="text-lg font-bold text-gray-900">
                  {venta.numero_boleta}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatDateTime(venta.fecha)}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {(customerInfo.nombre || customerInfo.documento) && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Datos del Cliente
                </h3>
                {customerInfo.nombre && (
                  <p className="text-sm text-gray-700">
                    Nombre: {customerInfo.nombre}
                  </p>
                )}
                {customerInfo.documento && (
                  <p className="text-sm text-gray-700">
                    Documento: {customerInfo.documento}
                  </p>
                )}
              </div>
            )}

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left py-2 text-gray-900 font-semibold">
                      Descripción
                    </th>
                    <th className="text-center py-2 text-gray-900 font-semibold">
                      Cantidad
                    </th>
                    <th className="text-right py-2 text-gray-900 font-semibold">
                      Precio Unit.
                    </th>
                    <th className="text-right py-2 text-gray-900 font-semibold">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                  <tbody>
                    {venta?.detalles && venta.detalles.length > 0 ? (
                      venta.detalles.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="py-2 text-gray-900">
                            {/* Mostramos el nombre si existe, si no, el ID */}
                            {item.producto?.nombre || item.nombre_producto || `Producto ID: ${item.producto_id}`}
                          </td>
                          <td className="py-2 text-center text-gray-900">
                            {item.cantidad}
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            {formatCurrency(item.precio_unitario)}
                          </td>
                          <td className="py-2 text-right text-gray-900 font-semibold">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                          No se encontraron detalles para esta venta.
                        </td>
                      </tr>
                    )}
                  </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mb-8 pb-8 border-b-2 border-gray-200">
              <div className="flex justify-end mb-2">
                <div className="w-64">
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Valor de Venta (sin IGV):</span>
                    <span>{formatCurrency(venta.subtotal_sin_igv ?? (venta.total / 1.18))}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 mb-3">
                    <span>IGV incluido (18%):</span>
                    <span>{formatCurrency(venta.igv ?? (venta.total - venta.total / 1.18))}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t-2 border-gray-300">
                    <span>Total a Pagar:</span>
                    <span>{formatCurrency(venta.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Método de Pago: {venta.metodo_pago}
              </p>
              <p className="text-xs text-gray-500">
                Gracias por su compra. ¡Vuelva pronto!
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleDownloadBoleta}
              className="btn btn-secondary w-full"
            >
              📥 Descargar PDF
            </button>
            <button
              onClick={handleFinishSale}
              className="btn btn-primary w-full"
            >
              ✅ Terminar
            </button>
          </div>
        </main>
      </>
    )
  }

  // Carrito vacío
  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8"
          >
            <ArrowLeft size={18} />
            Atrás
          </button>

          <div className="card p-12 text-center">
            <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Carrito Vacío
            </h2>
            <p className="text-gray-600 mb-6">
              No hay productos en tu carrito
            </p>
            <button
              onClick={() => router.push('/productos')}
              className="btn btn-primary"
            >
              Ir a Productos
            </button>
          </div>
        </main>
      </>
    )
  }

  // Carrito con items
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-8"
        >
          <ArrowLeft size={18} />
          Atrás
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Carrito Items */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Carrito de Compras ({items.length})
            </h2>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="card p-4 flex items-center gap-4">
                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {item.producto.nombre}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.producto.precio_venta)} c/u
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.cantidad - 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus size={18} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.producto.stock_actual}
                      value={item.cantidad}
                      onChange={(e) =>
                        updateQuantity(item.id, parseInt(e.target.value) || 1)
                      }
                      className="input text-center w-16 py-1"
                    />
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.cantidad + 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right w-32">
                    <p className="font-bold text-gray-900">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary & Checkout */}
          <div>
            <div className="card p-6 sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Resumen
              </h3>

              {/* Form */}
              <form onSubmit={handleCreateVenta} className="space-y-6">
                {/* Cliente Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customerInfo.nombre}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        nombre: e.target.value,
                      })
                    }
                    placeholder="Nombre del cliente"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={customerInfo.documento}
                    onChange={(e) =>
                      setCustomerInfo({
                        ...customerInfo,
                        documento: e.target.value,
                      })
                    }
                    placeholder="DNI / RUC"
                    className="input"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as
                          | 'Efectivo'
                          | 'Yape'
                          | 'Plin'
                          | 'Tarjeta'
                      )
                    }
                    className="input w-full"
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Yape">📱 Yape</option>
                    <option value="Plin">📱 Plin</option>
                    <option value="Tarjeta">💳 Tarjeta</option>
                  </select>
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Valor de Venta (sin IGV):</span>
                    <span>{formatCurrency(subtotalSinIgv)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>IGV incluido (18%):</span>
                    <span>{formatCurrency(montoIgv)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span>{formatCurrency(totalConIgv)}</span>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? 'Procesando...' : '✅ Completar Venta'}
                </button>
              </form>

              <button
                onClick={() => {
                  clear()
                  router.push('/productos')
                }}
                className="btn btn-secondary w-full mt-3"
              >
                Seguir Comprando
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
