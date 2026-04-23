'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function Home() {
  const router = useRouter()

  // Selectores individuales (mejor rendimiento en Zustand)
  const user = useAuthStore((state) => state.user)
  const getMe = useAuthStore((state) => state.getMe)

  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const verifySession = async () => {
      try {
        // Si ya hay usuario en el store, no validar otra vez
        if (user) {
          router.replace('/dashboard')
          return
        }

        // Validar sesión contra backend
        await getMe()

        // Si sigue montado, redirigir
        if (isMounted) {
          router.replace('/dashboard')
        }
      } catch (error) {
        // Si falla (token inválido o inexistente)
        if (isMounted) {
          router.replace('/login')
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    verifySession()

    return () => {
      isMounted = false
    }
  }, [user, getMe, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isChecking ? 'Verificando sesión...' : 'Redirigiendo...'}
        </p>
      </div>
    </div>
  )
}