import { create } from 'zustand'
import { CarritoItem, Producto } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface CarritoStore {
  items: CarritoItem[]
  addItem: (producto: Producto, cantidad: number) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, cantidad: number) => void
  clear: () => void
  getTotal: () => number
  getCount: () => number
}

export const useCarritoStore = create<CarritoStore>((set, get) => ({
  items: [],

  addItem: (producto: Producto, cantidad: number) => {
    set((state) => {
      const existingItem = state.items.find(
        (item) => item.producto.id === producto.id
      )

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.producto.id === producto.id
              ? {
                  ...item,
                  cantidad: item.cantidad + cantidad,
                  subtotal:
                    (item.cantidad + cantidad) * producto.precio_venta,
                }
              : item
          ),
        }
      }

      return {
        items: [
          ...state.items,
          {
            id: uuidv4(),
            producto,
            cantidad,
            subtotal: cantidad * producto.precio_venta,
          },
        ],
      }
    })
  },

  removeItem: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },

  updateQuantity: (id: string, cantidad: number) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad,
              subtotal: cantidad * item.producto.precio_venta,
            }
          : item
      ),
    }))
  },

  clear: () => {
    set({ items: [] })
  },

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.subtotal, 0)
  },

  getCount: () => {
    return get().items.reduce((count, item) => count + item.cantidad, 0)
  },
}))
