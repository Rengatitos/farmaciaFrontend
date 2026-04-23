'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Producto } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  producto: Producto
  categorias: any[]
  onClose: () => void
  onSuccess: () => void
}

export default function EditarProductoModal({ producto, categorias, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: producto.nombre,
    descripcion: producto.descripcion || '',
    precio_venta: producto.precio_venta,
    stock_actual: producto.stock_actual,
    categoria_id: producto.categoria_id || 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.updateProducto(producto.id, formData)
      toast.success('Producto actualizado')
      onSuccess() // Refresca la lista en el padre
      onClose()   // Cierra el modal
    } catch (error) {
      toast.error('Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Editar Producto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label-sm">Nombre</label>
              <input
                className="input w-full"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="label-sm text-gray-400">Código de Barras (Bloqueado)</label>
              <input
                className="input w-full bg-gray-50 text-gray-400 cursor-not-allowed"
                value={producto.codigo_barras}
                disabled
              />
            </div>

            <div>
              <label className="label-sm">Categoría</label>
              <select
                className="input w-full"
                value={formData.categoria_id}
                onChange={(e) => setFormData({...formData, categoria_id: parseInt(e.target.value)})}
              >
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-sm">Precio</label>
              <input
                type="number"
                step="0.01"
                className="input w-full"
                value={formData.precio_venta}
                onChange={(e) => setFormData({...formData, precio_venta: parseFloat(e.target.value)})}
              />
            </div>

            <div>
              <label className="label-sm">Stock Actual</label>
              <input
                type="number"
                className="input w-full"
                value={formData.stock_actual}
                onChange={(e) => setFormData({...formData, stock_actual: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="label-sm">Descripción</label>
            <textarea
              className="input w-full h-24 resize-none"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}