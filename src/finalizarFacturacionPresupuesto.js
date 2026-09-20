import { supabase } from './supabase.js'

const KEY = 'cusachs_presupuesto_pendiente_facturar'
let ocupado = false

function pendiente() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null }
}

async function finalizar() {
  const p = pendiente()
  if (!p?.presupuestoId || ocupado) return
  if (!confirm('¿Confirmas que ya has revisado los datos y pasado este presupuesto a facturar? Al finalizar quedará bloqueado para evitar duplicados.')) return
  ocupado = true
  try {
    const ahora = new Date().toISOString()
    const { error } = await supabase.from('presupuestos').update({ facturado_externamente: true, updated_at: ahora }).eq('id', p.presupuestoId).eq('facturado_externamente', false)
    if (error) throw error
    sessionStorage.removeItem(KEY)
    alert('Presupuesto marcado como FACTURADO. Ya no se podrá volver a pasar a facturar.')
    location.hash = '#/presupuestos'
  } catch (e) {
    alert(`No se ha podido finalizar: ${e?.message || e}`)
  } finally { ocupado = false }
}

function sincronizar() {
  const p = pendiente()
  const enDatos = String(location.hash || '').startsWith('#/facturacion')
  const viejo = document.getElementById('finalizar-presupuesto-factura')
  if (!p || !enDatos) { viejo?.remove(); return }
  if (viejo) return

  const cabecera = document.querySelector('.facturacion-cabecera')
  if (!cabecera) return
  const caja = document.createElement('div')
  caja.id = 'finalizar-presupuesto-factura'
  caja.style.cssText = 'width:100%;margin-top:14px;padding:14px 16px;border:2px solid #6d3a83;border-radius:14px;background:#f8f1fb;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap'
  caja.innerHTML = `<div><strong style="display:block;color:#5c257c">Presupuesto ${p.numero || ''}</strong><span>Revisa/edita los datos, el número de pedido y los importes. Puedes sacar el Resumen PDF antes de finalizar.</span></div>`
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'boton-principal'
  b.textContent = '✓ Finalizar y marcar FACTURADO'
  b.addEventListener('click', finalizar)
  caja.appendChild(b)
  cabecera.appendChild(caja)

  if (p.registroId) {
    setTimeout(() => {
      const filas = [...document.querySelectorAll('table tbody tr')]
      const fila = filas.find(f => f.textContent?.includes(p.numero || ''))
      const editar = fila ? [...fila.querySelectorAll('button')].find(x => /editar/i.test(x.textContent || '')) : null
      editar?.click()
    }, 250)
  }
}

const obs = new MutationObserver(() => setTimeout(sincronizar, 20))
obs.observe(document.documentElement, { childList:true, subtree:true })
window.addEventListener('hashchange', () => setTimeout(sincronizar, 80))
setTimeout(sincronizar, 100)
