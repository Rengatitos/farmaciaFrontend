'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api'
import Navbar from '@/components/Navbar'
import type { InfoFarmaco } from '@/types'
import { Pill, Search, Image as ImageIcon, ExternalLink, RefreshCw, Info } from 'lucide-react'
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

  // Lógica de "Scraping" del lado del cliente (Client-side Image Finder)
  const findDrugImage = (query: string) => {
    // Como no hay backend, construimos una URL de búsqueda de imágenes optimizada
    // Usamos DuckDuckGo para obtener un favicon de alta resolución o imagen relacionada si es posible
    // O simplemente generamos la URL para que el usuario la vea directamente.
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " medicamento caja")}&tbm=isch`
    
    // Fallback: Usamos un servicio de placeholder con el nombre para que la UI no se vea vacía
    // mientras el usuario decide abrir la búsqueda externa.
    setImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=f0fdf4&color=059669&size=512&bold=true`);
    
    return searchUrl;
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
      
      toast.success('Información cargada')
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'No se encontró el fármaco'
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-2">
              <Pill size={20} />
              <span className="uppercase tracking-wider text-xs">Consulta Rápida</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Vademécum Digital</h1>
          </div>
          <p className="text-gray-500 max-w-xs text-sm">
            Busca información técnica y visual de fármacos en tiempo real.
          </p>
        </div>

        {/* Buscador */}
        <section className="mb-10">
          <form onSubmit={handleBuscar} className="relative max-w-2xl">
            <input
              type="text"
              value={nombreFarmaco}
              onChange={(e) => setNombreFarmaco(e.target.value)}
              placeholder="Ingrese nombre del fármaco (ej. Naproxeno)"
              className="w-full h-16 pl-14 pr-36 rounded-2xl border-2 border-gray-100 shadow-xl focus:border-emerald-500 focus:ring-0 text-lg transition-all"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
            <button
              type="submit"
              disabled={!canSearch || isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:bg-gray-300 transition-colors"
            >
              {isSearching ? <RefreshCw className="animate-spin" size={18} /> : 'Buscar'}
            </button>
          </form>
        </section>

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Tarjeta de Imagen (Scraping Visual simulado) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-dashed border-gray-200 group relative">
                  <img 
                    src={imageUrl || ''} 
                    alt="Representación fármaco"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent((result.nombre || nombreFarmaco) + " medicamento caja")}&tbm=isch`}

                      className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                      <ImageIcon size={16} /> Abrir Imágenes
                    </a>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-4 italic">
                  * Previsualización generada. Haga clic para buscar la foto real del producto.
                </p>
                <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent((result.nombre || nombreFarmaco) + " composición química")}`}
                  target="_blank"
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  Ver Composición <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Ficha Técnica */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-emerald-600 p-8 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl font-bold capitalize mb-2">{result.nombre || nombreFarmaco}</h2>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                      {result.categoria || 'General'}
                    </span>
                  </div>
                  <Info size={32} className="opacity-50" />
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-1">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Presentación Comercial</h4>
                    <p className="text-gray-800 text-lg font-medium">{result.presentacion || 'Información no disponible'}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Laboratorio Responsable</h4>
                    <p className="text-gray-800 text-lg font-medium">{result.fabricante || 'Fabricante desconocido'}</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-50">
                  <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Descripción y Uso Terapéutico</h4>
                  <p className="text-gray-700 leading-relaxed text-lg bg-gray-50 p-6 rounded-2xl border-l-4 border-emerald-500 italic">
                    {result.descripcion || 'No se cuenta con una descripción detallada en este momento.'}
                  </p>
                </div>

                <div className="mt-8 flex justify-end">
                   <button 
                    onClick={() => {setResult(null); setNombreFarmaco('')}}
                    className="text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
                   >
                    Nueva Consulta
                   </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </>
  )
}