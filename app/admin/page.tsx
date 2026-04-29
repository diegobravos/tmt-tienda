'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { validateAdminPassword } from './actions'
import { supabase } from '../lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrderItem = {
  product_name: string
  variant: string
  quantity: number
  price: number
}

type Order = {
  id: string
  total: number
  shipping_cost: number
  delivery_date: string
  delivery_time: 'morning' | 'afternoon'
  status: 'pendiente' | 'pagado' | 'despachado'
  created_at: string
  customer_id: string
  customers: { name: string; phone: string; address: string } | { name: string; phone: string; address: string }[]
  order_items: OrderItem[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIME_LABELS: Record<string, string> = {
  morning: 'Mañana 10:00 – 13:00',
  afternoon: 'Tarde 15:00 – 19:00',
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pagado:     { label: 'Pagado',     badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  despachado: { label: 'Despachado', badge: 'bg-green-100 text-green-800 border-green-200' },
}

const STATUS_FILTERS = ['todos', 'pendiente', 'pagado', 'despachado'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCustomer(customers: Order['customers']) {
  return Array.isArray(customers) ? customers[0] : customers
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select(`
        id, total, shipping_cost, delivery_date, delivery_time, status, created_at, customer_id,
        customers ( name, phone, address ),
        order_items ( product_name, variant, quantity, price )
      `)
      .order('delivery_date', { ascending: true })
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(prev => new Set(prev).add(orderId))
    const { error, count } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()

    if (error) {
      alert('Error Supabase: ' + JSON.stringify(error))
    } else if (!count || count === 0) {
      alert('Sin efecto: 0 filas actualizadas. Probablemente RLS está bloqueando el UPDATE con la anon key.')
    }

    await fetchOrders()
    setUpdating(prev => { const s = new Set(prev); s.delete(orderId); return s })
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'todos' && o.status !== statusFilter) return false
    if (dateFilter && o.delivery_date !== dateFilter) return false
    return true
  })

  function handleOptimizeRoute() {
    const waypoints = filtered
      .map(o => getCustomer(o.customers)?.address)
      .filter(Boolean)
      .map(a => encodeURIComponent(a))
      .join('|')
    if (!waypoints) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&waypoints=${waypoints}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍅</span>
          <h1 className="font-bold text-zinc-900">Panel de administración TMT</h1>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por estado */}
          <div className="flex rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-[#CC3311] text-white'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {s === 'todos' ? 'Todos' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>

          {/* Filtro por fecha */}
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              ✕ Limpiar fecha
            </button>
          )}

          {/* Botón ruta */}
          <button
            onClick={handleOptimizeRoute}
            disabled={filtered.length === 0}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Optimizar ruta del día
          </button>
        </div>

        {/* Conteo */}
        {!loading && (
          <p className="text-xs text-zinc-400">
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
            {statusFilter !== 'todos' || dateFilter ? ' (filtrado)' : ''}
          </p>
        )}

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
          </div>
        )}

        {/* Sin resultados */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-400 text-sm">
            No hay pedidos que coincidan con los filtros.
          </div>
        )}

        {/* Tarjetas de pedidos */}
        {!loading && filtered.map(order => {
          const customer = getCustomer(order.customers)
          const isUpdating = updating.has(order.id)
          const status = STATUS_CONFIG[order.status]
          const itemsTotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Cabecera tarjeta */}
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100">
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-900">{customer?.name}</p>
                  <p className="text-sm text-zinc-500">{customer?.phone}</p>
                  <p className="text-sm text-zinc-500">{customer?.address}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${status?.badge}`}>
                    {status?.label}
                  </span>
                  <p className="text-xs text-zinc-400">
                    #{order.id.slice(0, 8)}
                  </p>
                </div>
              </div>

              {/* Fecha y horario */}
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2 text-sm text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="capitalize font-medium">{formatDate(order.delivery_date)}</span>
                <span className="text-zinc-400">·</span>
                <span>{TIME_LABELS[order.delivery_time] ?? order.delivery_time}</span>
              </div>

              {/* Productos */}
              <div className="px-5 py-4 space-y-2 border-b border-zinc-100">
                {order.order_items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-2 text-sm">
                    <span className="text-zinc-700">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-zinc-400"> ({item.variant})</span>
                      <span className="text-zinc-500"> × {item.quantity}</span>
                    </span>
                    <span className="shrink-0 text-zinc-800 font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totales + botones */}
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                {/* Totales */}
                <div className="text-sm space-y-0.5">
                  <div className="flex gap-6 text-zinc-500">
                    <span>Subtotal <span className="text-zinc-800 font-medium">{formatPrice(itemsTotal)}</span></span>
                    <span>
                      Despacho{' '}
                      <span className={`font-medium ${order.shipping_cost === 0 ? 'text-green-600' : 'text-zinc-800'}`}>
                        {order.shipping_cost === 0 ? 'Gratis' : formatPrice(order.shipping_cost)}
                      </span>
                    </span>
                  </div>
                  <p className="font-bold text-base text-zinc-900">
                    Total <span className="text-[#CC3311]">{formatPrice(order.total + order.shipping_cost)}</span>
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pendiente' && (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, 'pagado')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Marcar como pagado'}
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'despachado')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Marcar como despachado'}
                      </button>
                    </>
                  )}
                  {order.status === 'pagado' && (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, 'despachado')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Marcar como despachado'}
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'pendiente')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl border border-zinc-300 text-zinc-500 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Revertir a pendiente'}
                      </button>
                    </>
                  )}
                  {order.status === 'despachado' && (
                    <>
                      <button
                        onClick={() => updateStatus(order.id, 'pagado')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl border border-zinc-300 text-zinc-500 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Revertir a pagado'}
                      </button>
                      <button
                        onClick={() => updateStatus(order.id, 'pendiente')}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-xl border border-zinc-300 text-zinc-500 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? '...' : 'Revertir a pendiente'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}

// ─── Página principal (auth) ──────────────────────────────────────────────────

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === 'true') setAuthenticated(true)
    setChecked(true)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const ok = await validateAdminPassword(password)
      if (ok) {
        sessionStorage.setItem('admin_auth', 'true')
        setAuthenticated(true)
      } else {
        setError('Contraseña incorrecta')
        setPassword('')
      }
    })
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_auth')
    setAuthenticated(false)
    setPassword('')
  }

  if (!checked) return null

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-6 text-center">
            <span className="text-3xl">🍅</span>
            <h1 className="mt-2 text-xl font-bold text-zinc-900">Panel TMT</h1>
            <p className="text-sm text-zinc-500 mt-1">Ingresa la contraseña para continuar</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              required
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311] focus:border-transparent"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending || !password}
              className="w-full py-3 rounded-xl bg-[#CC3311] text-white font-semibold text-sm hover:bg-[#b02d0e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <AdminDashboard onLogout={handleLogout} />
}
