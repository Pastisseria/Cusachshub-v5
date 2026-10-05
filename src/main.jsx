import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/offline.css'
import { iniciarOffline } from './lib/offline.js'
import './datosFacturaPremium.css'
import './presupuestoClienteExtra.js'
import './presupuestoFacturadoControl.js'
import './finalizarFacturacionPresupuesto.js'
import './datosFacturaSimplificado.js'
import './historicoFacturacionFiltro.js'
import './produccionPrintA4.css'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'

iniciarOffline()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
