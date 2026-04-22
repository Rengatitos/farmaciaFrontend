'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import { ReporteAnalisis } from '@/types'
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
import {
  Send,
  Download,
  MessageSquare,
  TrendingUp,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

export default function ReportesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ReporteAnalisis | null>(null)
  const [ventasAnalysis, setVentasAnalysis] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; message: string }[]
  >([])
  const [chatLoading, setChatLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const loadReport = useCallback(async (mes = selectedMonth, anio = selectedYear) => {
    try {
      setReportLoading(true)
      const [monthly, analisis] = await Promise.all([
        apiClient.getReporteMonthly(mes, anio),
        apiClient.getAnalisisVentas(mes, anio).catch(() => ''),
      ])

      setReport(monthly)
      if (analisis) setVentasAnalysis(analisis)
    } catch (error) {
      toast.error('No se pudo cargar el reporte mensual')
      console.error(error)

      try {
        const analisisFallback = await apiClient.getAnalisisVentas(mes, anio)
        setVentasAnalysis(analisisFallback)
        setReport({
          periodo: `${String(mes).padStart(2, '0')}/${anio}`,
          total_ventas: 0,
          total_ingreso: 0,
          productos_vendidos: 0,
          producto_mas_vendido: 'Sin datos',
          metodo_pago_favorito: 'N/A',
          analisis_ia: analisisFallback,
          recomendaciones: 'Revisa el análisis de ventas para más contexto.',
        })
      } catch (fallbackError) {
        console.error(fallbackError)
      }
    } finally {
      setReportLoading(false)
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadReport()
  }, [user, router, loadReport])

  const monthOptions = useMemo(() => [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ], [])

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true)
      await apiClient.sendReporteMonthlyEmail(selectedMonth, selectedYear)
      toast.success('✉️ Reporte enviado por correo exitosamente')
    } catch (error) {
      toast.error('Error al enviar el reporte por correo')
      console.error(error)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    try {
      setChatLoading(true)
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', message: chatMessage },
      ])

      const response = await apiClient.getChatbotResponse(chatMessage)
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', message: response.respuesta },
      ])
      setChatMessage('')
    } catch (error) {
      toast.error('Error al procesar la pregunta')
      console.error(error)
    } finally {
      setChatLoading(false)
    }
  }

  const handleDownloadCSV = async (type: 'compras' | 'ventas') => {
    try {
      const csv =
        type === 'compras'
          ? await apiClient.downloadComprasCSV(selectedMonth, selectedYear)
          : await apiClient.downloadVentasCSV(selectedMonth, selectedYear)
      const url = window.URL.createObjectURL(csv)
      const link = document.createElement('a')
      link.href = url
      link.download = `${type}-${new Date().toISOString().slice(0, 7)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`${type.toUpperCase()} descargado exitosamente`)
    } catch (error) {
      toast.error('Error al descargar archivo')
    }
  }

  const handleGenerateReport = async () => {
    await loadReport(selectedMonth, selectedYear)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando reportes...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-2">
            Análisis e informes de tu farmacia
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Reporte Mensual */}
            {report && (
              <div className="card p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      📊 Reporte del Mes
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Genera reportes por período y revisa el análisis de ventas con fallback automático.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="input min-w-[140px]"
                      >
                        {monthOptions.map((month) => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                      <input
                        type="number"
                        min={2020}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                        className="input min-w-[120px]"
                      />
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={reportLoading}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <FileText size={18} />
                      {reportLoading ? 'Cargando...' : 'Generar'}
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Send size={18} />
                      {sendingEmail ? 'Enviando...' : 'Enviar por Email'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 pb-8 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Período</p>
                    <p className="font-semibold text-gray-900">
                      {report.periodo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Ventas</p>
                    <p className="font-semibold text-gray-900">
                      {report.total_ventas}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Total Ingreso
                    </p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(report.total_ingreso)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Productos Vendidos
                    </p>
                    <p className="font-semibold text-gray-900">
                      {report.productos_vendidos}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Producto Más Vendido
                    </p>
                    <p className="font-semibold text-gray-900 bg-blue-50 p-3 rounded">
                      {report.producto_mas_vendido}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Método de Pago Favorito
                    </p>
                    <p className="font-semibold text-gray-900 bg-green-50 p-3 rounded">
                      {report.metodo_pago_favorito}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    🤖 Análisis por IA
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 text-gray-700 leading-relaxed">
                    {report.analisis_ia}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    💡 Recomendaciones
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-gray-700 leading-relaxed">
                    {report.recomendaciones}
                  </div>
                </div>
              </div>
            )}

            {ventasAnalysis && (
              <div className="card p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  🔎 Análisis de Ventas
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Lectura rápida para cuando el reporte mensual necesita fallback.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 leading-relaxed whitespace-pre-line">
                  {ventasAnalysis}
                </div>
              </div>
            )}

            {/* Downloads */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                📥 Descargar Reportes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleDownloadCSV('compras')}
                  className="btn btn-secondary flex items-center justify-center gap-2 w-full"
                >
                  <Download size={18} />
                  Descargar Compras
                </button>
                <button
                  onClick={() => handleDownloadCSV('ventas')}
                  className="btn btn-secondary flex items-center justify-center gap-2 w-full"
                >
                  <Download size={18} />
                  Descargar Ventas
                </button>
              </div>
            </div>
          </div>

          {/* Chatbot */}
          <div className="lg:col-span-1">
            <div className="card flex flex-col h-full">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={20} />
                  Asistente IA
                </h3>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '400px' }}>
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 mb-2">
                      Hola 👋 ¿En qué puedo ayudarte?
                    </p>
                    <p className="text-xs text-gray-400">
                      Pregunta sobre stock, ventas, recomendaciones, etc.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-3 py-2 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    className="input flex-1 py-2"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatMessage.trim()}
                    className="btn btn-primary px-3 py-2 flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
