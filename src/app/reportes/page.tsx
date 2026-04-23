'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'

export default function ReportePage() {
  const [reporte, setReporte] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const data = await apiClient.getReporteMonthly(4, 2026)
      setReporte(data)
    }

    fetchData()
  }, [])

  if (!reporte) return <p>Cargando...</p>

  return (
    <div>
      <h1>Reporte mensual</h1>
      <p>Mes: {reporte.mes}</p>
      <p>Año: {reporte.anio}</p>
      <p>Análisis: {reporte.analisis}</p>
      <p>Fecha: {new Date(reporte.timestamp).toLocaleString()}</p>
    </div>
  )
}