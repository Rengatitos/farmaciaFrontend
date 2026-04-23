'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { InfoFarmaco } from '@/types'
import { Pill, Search, Image as ImageIcon, ExternalLink, RefreshCw, Info, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConsultasFarmacosPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [nombreFarmaco, setNombreFarmaco] = useState('')
  const [result, setResult] = useState<InfoFarmaco | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const canSearch = useMemo(() => nombreFarmaco.trim().length >= 2, [nombreFarmaco])

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  const findDrugImage = (query: string) => {
    // Generamos un placeholder celeste estético mientras el usuario consulta la imagen real
    setImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=e0f2fe&color=0284c7&size=512&bold=true`);
  }

  const handleBuscar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canSearch) {
      toast.error('Escribe al menos 2 caracteres')
      return
    }

    try {
      setIsSearching(true)
      const data = await apiClient.buscarInfoFarmaco(nombreFarmaco.trim())
      setResult(data)
      findDrugImage(data.nombre || nombreFarmaco)
      toast.success('Información actualizada')
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Fármaco no encontrado'
      toast.error(message)
      setResult(null)
    } finally {
      setIsSearching(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Header Celeste */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 font-semibold mb-2">
              <Pill size={22} className="rotate-45" />
              <span className="uppercase tracking-widest text-xs">Consulta uso de algunos farmacos</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Consulta de Fármacos</h1>
          </div>
          <p className="text-slate-500 max-w-xs text-sm border-l-2 border-sky-100 pl-4">
            Base de datos técnica para análisis de componentes y presentaciones comerciales.
          </p>
        </div>

        {/* Buscador Estilo Moderno */}
        <section className="mb-12">
          <form onSubmit={handleBuscar} className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={nombreFarmaco}
              onChange={(e) => setNombreFarmaco(e.target.value)}
              placeholder="¿Qué fármaco deseas investigar? (ej. Enalapril)"
              className="w-full h-16 pl-14 pr-40 rounded-2xl border-2 border-slate-100 shadow-xl shadow-sky-100/50 focus:border-sky-400 focus:ring-0 text-lg transition-all outline-none"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-sky-400" size={24} />
            <button
              type="submit"
              disabled={!canSearch || isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:bg-slate-200 transition-all active:scale-95"
            >
              {isSearching ? <RefreshCw className="animate-spin" size={18} /> : 'Consultar'}
            </button>
          </form>
        </section>

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Visual Side (Imagen) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-full aspect-square bg-sky-50 rounded-2xl mb-5 flex items-center justify-center overflow-hidden border border-sky-100 group relative">
                  <img 
                    src={imageUrl || ''} 
                    alt="ID de fármaco"
                    className="w-full h-full object-cover mix-blend-multiply opacity-80"
                  />
                  <div className="absolute inset-0 bg-sky-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent((result.nombre || nombreFarmaco) + " medicamento empaque")}&tbm=isch`}
                      target="_blank"
                      className="bg-white text-sky-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-sky-50 transition-colors"
                    >
                      <ImageIcon size={18} /> Ver fotos reales
                    </a>
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-800 mb-1">{result.nombre || nombreFarmaco}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Referencia visual generada para identificación rápida.
                </p>

                <div className="w-full pt-4 border-t border-slate-50 flex flex-col gap-2">
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent("prospecto oficial " + (result.nombre || nombreFarmaco))}`}
                    target="_blank"
                    className="text-sky-600 text-sm font-semibold hover:text-sky-700 flex items-center justify-center gap-2"
                  >
                    <FileText size={14} /> Leer Prospecto Oficial
                  </a>
                </div>
              </div>
            </div>

            {/* Content Side (Data) */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              {/* Banner Superior Celeste */}
              <div className="bg-gradient-to-r from-sky-600 to-sky-400 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-sky-300/30 text-sky-50 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest mb-3 inline-block">
                      {result.categoria || 'Sin Categoría'}
                    </span>
                    <h2 className="text-4xl font-bold capitalize leading-none">{result.nombre || nombreFarmaco}</h2>
                  </div>
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                    <Info size={28} className="text-sky-100" />
                  </div>
                </div>
              </div>

              <div className="p-8 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-sky-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Presentación</h4>
                    <p className="text-slate-700 font-bold text-lg">{result.presentacion || 'No especificada'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-sky-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Fabricante</h4>
                    <p className="text-slate-700 font-bold text-lg">{result.fabricante || 'Desconocido'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción Técnica</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="relative">
                    <p className="text-slate-600 leading-relaxed text-lg italic pl-6 border-l-4 border-sky-200 py-2">
                      {result.descripcion || 'No se encontró una descripción detallada en los registros actuales.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer de la tarjeta */}
              <div className="px-8 py-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-50">
                <p className="text-[10px] text-slate-400 italic">Datos obtenidos vía API Farmacéutica</p>
                <button 
                  onClick={() => {setResult(null); setNombreFarmaco('')}}
                  className="text-sky-500 hover:text-sky-700 text-xs font-bold uppercase tracking-tighter transition-colors"
                >
                  Nueva Búsqueda
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </>
  )
}