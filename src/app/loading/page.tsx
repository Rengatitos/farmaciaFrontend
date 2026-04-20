'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function LoadingPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    // Una vez que el user está cargado, redirigir al dashboard
    if (user) {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>

      <div className="relative text-center">
        {/* Logo Animation */}
        <div className="w-20 h-20 bg-gradient-to-br from-primary-300 to-primary-400 rounded-lg flex items-center justify-center mx-auto mb-6 animate-bounce">
          <span className="text-white font-bold text-4xl">FS</span>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-transparent border-t-white border-r-white rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-transparent border-b-primary-300 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-4xl font-bold text-white mb-4">
          ¡Bienvenido!
        </h1>
        <p className="text-primary-100 text-lg mb-2">
          Farmacia Sara
        </p>
        <p className="text-primary-200">
          Cargando tu dashboard...
        </p>
      </div>
    </div>
  )
}
