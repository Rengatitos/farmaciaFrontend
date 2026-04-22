'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import { Venta } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Eye, Download, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export default function VentasPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState<Venta[]>([])
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([])
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  )

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchVentas = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getVentas(0, 100)
        setVentas(data)
      } catch (error) {
        toast.error('Error al cargar ventas')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchVentas()
  }, [user, router])

  // Filter ventas by month
  useEffect(() => {
    const filtered = ventas.filter((v) => {
      const ventaMonth = v.fecha.slice(0, 7)
      return ventaMonth === filterMonth
    })
    setFilteredVentas(filtered)
  }, [filterMonth, ventas])

  const downloadVentasCSV = async () => {
    try {
      const csv = await apiClient.downloadVentasCSV()
      const url = window.URL.createObjectURL(csv)
      const link = document.createElement('a')
      link.href = url
      link.download = `ventas-${filterMonth}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('CSV descargado exitosamente')
    } catch (error) {
      toast.error('Error al descargar CSV')
    }
  }

  // Calculate statistics
  const totalVentas = filteredVentas.length
  const totalIngreso = filteredVentas.reduce((sum, v) => sum + v.total, 0)
  const promedioVenta = totalVentas > 0 ? totalIngreso / totalVentas : 0

  // Payment method breakdown
  const metodosPago: { [key: string]: number } = {}
  filteredVentas.forEach((v) => {
    metodosPago[v.metodo_pago] =
      (metodosPago[v.metodo_pago] || 0) + v.total
  })

  const metodosData = Object.entries(metodosPago).map(([method, total]) => ({
    name: method,
    value: total,
  }))

  // Daily sales
  const ventasPorDia: { [key: string]: number } = {}
  filteredVentas.forEach((v) => {
    const dia = v.fecha.slice(0, 10)
    ventasPorDia[dia] = (ventasPorDia[dia] || 0) + v.total
  })

  const ventasDiaData = Object.entries(ventasPorDia)
    .map(([dia, total]) => ({
      date: dia,
      total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando ventas...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedVenta ? (
          // Detalle de venta
          <>
            <button
              onClick={() => setSelectedVenta(null)}
              className="text-primary-600 hover:text-primary-700 font-medium mb-6"
            >
              ← Volver
            </button>

            <div className="card p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Boleta {selectedVenta.numero_boleta}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {formatDateTime(selectedVenta.fecha)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Método de Pago</p>
                  <p className="font-semibold text-gray-900">
                    {selectedVenta.metodo_pago}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(selectedVenta.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <span className="badge badge-success">Completada</span>
                </div>
              </div>

              {selectedVenta.nombre_cliente && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Datos del Cliente
                  </h3>
                  {selectedVenta.nombre_cliente && (
                    <p className="text-gray-700">
                      Nombre: {selectedVenta.nombre_cliente}
                    </p>
                  )}
                  {selectedVenta.documento_cliente && (
                    <p className="text-gray-700">
                      Documento: {selectedVenta.documento_cliente}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Productos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">
                          Producto ID
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Cantidad
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Precio Unit.
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVenta.detalles.map((detalle, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900">
                            {detalle.producto_id}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {detalle.cantidad}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {formatCurrency(detalle.precio_unitario)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {formatCurrency(detalle.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
              <p className="text-gray-600 mt-2">
                Historial de boletas generadas
              </p>
            </div>

            {/* Filter and Download */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Mes
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="input pl-10 w-full"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={downloadVentasCSV}
                  className="btn btn-secondary flex items-center gap-2 w-full sm:w-auto"
                >
                  <Download size={18} />
                  Descargar CSV
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card p-6">
                <p className="text-sm text-gray-600 mb-1">Total de Ventas</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalVentas}
                </p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-gray-600 mb-1">Ingreso Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(totalIngreso)}
                </p>
              </div>
              <div className="card p-6">
                <p className="text-sm text-gray-600 mb-1">Promedio por Venta</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(promedioVenta)}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Ventas por Día */}
              {ventasDiaData.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Ventas por Día
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ventasDiaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Métodos de Pago */}
              {metodosData.length > 0 && (
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Ingresos por Método de Pago
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metodosData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {metodosData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Ventas Table */}
            <div className="card overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  Boletas Generadas
                </h3>
              </div>

              {filteredVentas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">
                          Boleta
                        </th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">
                          Fecha
                        </th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">
                          Método
                        </th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">
                          Total
                        </th>
                        <th className="text-left py-3 px-6 font-semibold text-gray-700">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVentas.map((venta) => (
                        <tr
                          key={venta.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-6 font-medium text-gray-900">
                            {venta.numero_boleta}
                          </td>
                          <td className="py-3 px-6 text-gray-600">
                            {formatDateTime(venta.fecha)}
                          </td>
                          <td className="py-3 px-6">
                            <span className="badge badge-info">
                              {venta.metodo_pago}
                            </span>
                          </td>
                          <td className="py-3 px-6 font-semibold text-gray-900">
                            {formatCurrency(venta.total)}
                          </td>
                          <td className="py-3 px-6">
                            <button
                              onClick={() => setSelectedVenta(venta)}
                              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                            >
                              <Eye size={18} />
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-600">
                    No hay ventas en este mes
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
