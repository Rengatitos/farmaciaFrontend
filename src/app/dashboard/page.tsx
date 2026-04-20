'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Star,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { DashboardResumen, VentasPorMetodo, Prediccion } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState<DashboardResumen | null>(null)
  const [ventasPorMetodo, setVentasPorMetodo] = useState<any[]>([])
  const [predicciones, setPredicciones] = useState<Prediccion[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const [resumenData, metodos, preds] = await Promise.all([
          apiClient.getDashboardResumen(),
          apiClient.getVentasPorMetodo(),
          apiClient.getPredicciones(),
        ])

        setResumen(resumenData)

        // Transformar datos de métodos de pago
        const metodosArray = Object.entries(metodos).map(([method, data]: any) => ({
          name: method,
          cantidad: data.cantidad,
          total: data.total,
        }))
        setVentasPorMetodo(metodosArray)
        setPredicciones(preds)
      } catch (error) {
        toast.error('Error al cargar datos del dashboard')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando dashboard...</p>
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
          <h1 className="text-4xl font-bold text-gray-900">
            Bienvenido, {user?.nombre.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Aquí está el resumen de tu farmacia hoy
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Ventas */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total de Ventas Hoy
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {resumen?.total_ventas_hoy || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Total Ingreso */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Ingreso Total Hoy
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(resumen?.total_ingreso_hoy || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Bajo Stock */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Productos Bajo Stock
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {resumen?.productos_bajo_stock || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          {/* Promedio Venta */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Promedio por Venta
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(resumen?.promedio_venta_hoy || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          {/* Total Productos */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total de Productos
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {resumen?.total_productos || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Package className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          {/* Más Vendido */}
          <div className="card p-6 hover:shadow-subtle-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Producto Más Vendido
                </p>
                <p className="text-lg font-bold text-gray-900 truncate">
                  {resumen?.producto_mas_vendido || 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                <Star className="text-pink-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ventas por Método de Pago */}
          {ventasPorMetodo.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Ventas por Método de Pago
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ventasPorMetodo}
                    dataKey="cantidad"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {ventasPorMetodo.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            '#0ea5e9',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                          ][index % 4]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} ventas`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ingresos por Método */}
          {ventasPorMetodo.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Ingresos por Método
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ventasPorMetodo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Predicciones para el próximo mes */}
        {predicciones.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🔮 Predicciones - Productos Más Vendidos Próximo Mes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Predicción
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Confianza
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Barra
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {predicciones.slice(0, 10).map((pred) => (
                    <tr
                      key={pred.producto_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {pred.nombre_producto}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {pred.prediccion_cantidad} unidades
                      </td>
                      <td className="py-3 px-4">
                        <span className="badge badge-success">
                          {(pred.confianza * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{
                              width: `${pred.confianza * 100}%`,
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
