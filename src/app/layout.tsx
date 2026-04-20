import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Farmacia Sara Sanchez',
  description: 'Sistema de gestión de farmacia moderno y eficiente',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
