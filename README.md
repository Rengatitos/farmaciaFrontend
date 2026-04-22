# Farmacia Sara Sanchez - Frontend

Frontend moderno y estético para el sistema de gestión integral de farmacia construido con **Next.js 14**, **React 18**, **Tailwind CSS** y **TypeScript**.

## 🎯 Características Principales

✅ **Autenticación segura** - Login y registro con JWT  
✅ **Dashboard inteligente** - KPIs en tiempo real y gráficos  
✅ **Gestión de productos** - Búsqueda avanzada y lector de códigos de barras  
✅ **Sistema de ventas** - Carrito intuitivo y generación de boletas PDF  
✅ **Historial de ventas** - Visualización con gráficos y filtrado por mes  
✅ **Reportes mensuales** - Análisis con IA (Google Gemini)  
✅ **Chatbot IA** - Asistente inteligente para consultas de stock  
✅ **Descargas CSV** - Exportación de reportes de compras y ventas  
✅ **Diseño Responsive** - Funciona en PC, tablet y móvil  
✅ **Lector de códigos de barras** - Integración con cámara del dispositivo  

## 🚀 Instalación

### Requisitos previos
- Node.js 18+ 
- npm o yarn
- Backend ejecutándose en `https://farmaciabackend-5843.onrender.com`

### Pasos de instalación

1. **Navega a la carpeta del frontend**
```bash
cd Frontend
```

2. **Instala las dependencias**
```bash
npm install
```

3. **Configura las variables de entorno**
```bash
# .env.local ya está configurado
# Si necesitas cambiar la URL del API, edita:
NEXT_PUBLIC_API_URL=https://farmaciabackend-5843.onrender.com
```

4. **Inicia el servidor de desarrollo**
```bash
npm run dev
```

5. **Abre en tu navegador**
```
http://localhost:3000
```

## 📋 Estructura del Proyecto

```
src/
├── app/                 # Páginas principales (Next.js App Router)
│   ├── login/          # Página de autenticación
│   ├── register/       # Registro de usuarios
│   ├── dashboard/      # Panel principal con KPIs
│   ├── productos/      # Gestión y búsqueda de productos
│   ├── checkout/       # Carrito de compras y ventas
│   ├── ventas/         # Historial de boletas
│   ├── reportes/       # Reportes mensuales y chatbot
│   ├── globals.css     # Estilos globales
│   └── layout.tsx      # Layout principal
├── components/         # Componentes reutilizables
│   └── Navbar.tsx      # Navegación principal
├── lib/                # Utilidades y configuraciones
│   ├── api.ts         # Cliente de API con axios
│   └── utils.ts       # Funciones auxiliares
├── stores/             # Estado global (Zustand)
│   ├── authStore.ts   # Autenticación
│   └── carritoStore.ts # Carrito de compras
├── types/              # Tipos TypeScript
│   └── index.ts       # Interfaces del proyecto
└── pages/              # Rutas especiales (si aplica)
```

## 🔐 Credenciales de Demo

**Email:** `admin@farmacia.com`  
**Contraseña:** `password`

## 📱 Funcionalidades Detalladas

### 1. Autenticación
- Login y registro de usuarios
- Roles: Admin y Vendedor
- JWT con almacenamiento seguro en localStorage

### 2. Dashboard
- KPIs en tiempo real (ventas, ingresos, stock bajo)
- Gráficos de métodos de pago
- Predicciones de IA para productos más vendidos

### 3. Gestión de Productos
- Búsqueda por nombre, descripción o código de barras
- Lector de códigos de barras con cámara del dispositivo
- Filtrado por estado de stock
- Añadir productos al carrito con cantidad variable

### 4. Sistema de Ventas
- Carrito intuitivo con edición de cantidades
- Múltiples métodos de pago (Efectivo, Yape, Plin, Tarjeta)
- Datos del cliente opcionales
- Generación de boleta con número único
- Descarga de boleta en PDF

### 5. Historial de Ventas
- Listado de todas las boletas generadas
- Filtrado por mes
- Gráficos de ventas por día
- Análisis por método de pago
- Detalles completos de cada venta
- Descarga de CSV

### 6. Reportes e IA
- Reporte mensual automático con análisis de Google Gemini
- Envío de reportes por email
- Chat con IA para preguntas sobre stock y recomendaciones
- Descargas de CSV de compras y ventas

## 🛠️ Desarrollo

### Build para producción
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 📚 Librerías Principales

- **Next.js 14** - Framework React
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Gráficos
- **jsPDF** - Generación de PDFs
- **html2canvas** - Captura de DOM
- **react-hot-toast** - Notificaciones
- **Lucide React** - Icons
- **date-fns** - Formateo de fechas

## 🔗 Integración con Backend

El frontend se conecta con los siguientes endpoints:

```
POST   /auth/login                      - Iniciar sesión
POST   /auth/register                   - Registrarse
GET    /auth/me                         - Obtener usuario actual
GET    /productos                       - Listar productos
GET    /productos/{barcode}             - Buscar por código
POST   /ventas/boleta                   - Crear venta
GET    /ventas                          - Listar ventas
GET    /analytics/dashboard/resumen     - KPIs del dashboard
GET    /analytics/prediccion            - Predicciones IA
GET    /reports/monthly                 - Reporte mensual
POST   /reports/monthly/send-email      - Enviar reporte
GET    /reports/chatbot?pregunta=...    - Chat con IA
GET    /reports/descargar/compras       - Descargar compras
GET    /reports/descargar/ventas        - Descargar ventas
```

## 🎨 Tema y Colores

El proyecto usa un sistema de colores profesional:

- **Primario:** Azul cielo (`#0ea5e9`)
- **Éxito:** Verde (`#10b981`)
- **Alerta:** Amarillo (`#f59e0b`)
- **Peligro:** Rojo (`#ef4444`)

## 📱 Responsive Design

- ✅ Mobile First
- ✅ Tablet optimizado
- ✅ Desktop completo
- ✅ Lector de códigos de barras adaptativo

## 🚨 Troubleshooting

### "Cannot reach API"
- Verifica que el backend está corriendo en `https://farmaciabackend-5843.onrender.com`
- Revisa `NEXT_PUBLIC_API_URL` en `.env.local`

### "Camera not working"
- En desarrollo local, es posible que necesites HTTPS
- En móvil, asegúrate de permitir acceso a la cámara

### "Token expired"
- Abre DevTools → Application → localStorage
- Elimina `access_token` si es necesario

## 📧 Soporte

Para problemas o sugerencias, contacta al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-19  
**Autor:** Equipo de Desarrollo Farmacia Sara Sanchez
