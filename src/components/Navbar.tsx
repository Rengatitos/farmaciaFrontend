'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useCarritoStore } from '@/stores/carritoStore'
import {
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Home,
  Package,
  TrendingUp,
  FileText,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { getCount } = useCarritoStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const cartCount = getCount()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/ventas', label: 'Ventas', icon: TrendingUp },
    { href: '/reportes', label: 'Reportes', icon: FileText },
    { href: '/admin/productos', label: 'Administración', icon: Settings },
  ]

  return (
    <nav className="bg-white shadow-subtle border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">FS</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-lg font-bold text-gray-900">Farmacia Sara</p>
              <p className="text-xs text-gray-500">Sistema de Gestión</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  pathname === href
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Carrito */}
            <Link
              href="/checkout"
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-danger rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-xs text-gray-500">{user?.rol}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors block ${
                  pathname === href
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
