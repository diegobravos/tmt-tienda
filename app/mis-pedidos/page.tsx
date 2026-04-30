'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  order_items: OrderItem[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pagado:     { label: 'Pagado',     badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  despachado: { label: 'Despachado', badge: 'bg-green-100 text-green-800 border-green-200' },
}

const TIME_LABELS: Record<string, string> = {
  morning: 'Mañana 10:00 – 13:00',
  afternoon: 'Tarde 15:00 – 19:00',
}

const STORAGE_KEY = 'tmt_customer_phone'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-CL')}`
}

function formatCreatedAt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDeliveryDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MisPedidosPage() {
  const [phone, setPhone] = useState('')
  const [savedPhone, setSavedPhone] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [checked, setChecked] = useState(false)

  // Leer teléfono guardado en localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSavedPhone(stored)
      fetchOrders(stored)
    } else {
      setChecked(true)
    }
  }, [])

  async function fetchOrders(tel: string) {
    setLoading(true)
    setNotFound(false)

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', tel.trim())
      .maybeSingle()

    if (!customer) {
      setNotFound(true)
      setLoading(false)
      setChecked(true)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('id, total, shipping_cost, delivery_date, delivery_time, status, created_at, order_items(product_name, variant, quantity, price)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(1000)

    setOrders((data as Order[]) ?? [])
    setLoading(false)
    setChecked(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    localStorage.setItem(STORAGE_KEY, phone.trim())
    setSavedPhone(phone.trim())
    fetchOrders(phone.trim())
  }

  function handleChangePhone() {
    localStorage.removeItem(STORAGE_KEY)
    setSavedPhone(null)
    setOrders([])
    setNotFound(false)
    setPhone('')
  }

  if (!checked) return null

  // ── Formulario de teléfono ──
  if (!savedPhone) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <header className="bg-[#CC3311] text-white py-5 px-6 shadow-md">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
              ← Volver
            </Link>
            <span className="text-white/40">|</span>
            <span className="font-bold">TMT Tienda</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <span className="text-5xl">🍅</span>
              <h1 className="mt-4 text-2xl font-bold text-zinc-900">Mis pedidos</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Ingresa tu teléfono para ver el historial de tus pedidos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-zinc-200 px-6 py-6 space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 rounded-xl bg-[#CC3311] text-white font-semibold text-sm hover:bg-[#aa2a0d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Buscando…' : 'Ver mis pedidos'}
              </button>
            </form>
          </div>
        </main>
      </div>
    )
  }

  // ── Vista de pedidos ──
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-[#CC3311] text-white py-5 px-6 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
              ← Volver
            </Link>
            <span className="text-white/40">|</span>
            <h1 className="font-bold">Mis pedidos</h1>
          </div>
          <button
            onClick={handleChangePhone}
            className="text-xs text-white/70 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-full transition-colors"
          >
            Cambiar número
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Teléfono activo */}
        <p className="text-xs text-zinc-400">
          Mostrando pedidos para <span className="font-medium text-zinc-600">{savedPhone}</span>
        </p>

        {/* Cargando */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
          </div>
        )}

        {/* No encontrado */}
        {!loading && notFound && (
          <div className="text-center py-16 space-y-3">
            <span className="text-4xl">🔍</span>
            <p className="text-zinc-700 font-medium">No encontramos pedidos con este número</p>
            <p className="text-sm text-zinc-400">Verifica que el teléfono coincida con el que usaste al hacer tu pedido</p>
            <button
              onClick={handleChangePhone}
              className="mt-2 text-sm font-medium text-[#CC3311] hover:underline"
            >
              Intentar con otro número
            </button>
          </div>
        )}

        {/* Sin pedidos */}
        {!loading && !notFound && orders.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <span className="text-4xl">📦</span>
            <p className="text-zinc-700 font-medium">Aún no tienes pedidos</p>
            <p className="text-sm text-zinc-400">Cuando hagas tu primer pedido, aparecerá aquí</p>
            <Link
              href="/"
              className="inline-block mt-3 px-5 py-2.5 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] transition-colors"
            >
              Ver productos
            </Link>
          </div>
        )}

        {/* Tarjetas de pedidos */}
        {!loading && orders.map(order => {
          const status = STATUS_CONFIG[order.status]
          const itemsSubtotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100">
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-400 capitalize">{formatCreatedAt(order.created_at)}</p>
                  <p className="text-xs text-zinc-400">#{order.id.slice(0, 8)}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-semibold ${status?.badge}`}>
                  {status?.label}
                </span>
              </div>

              {/* Fecha y horario de entrega */}
              <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2 text-sm text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="capitalize font-medium">{formatDeliveryDate(order.delivery_date)}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-500">{TIME_LABELS[order.delivery_time] ?? order.delivery_time}</span>
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

              {/* Totales */}
              <div className="px-5 py-4 text-sm space-y-0.5">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Despacho</span>
                  <span className={order.shipping_cost === 0 ? 'text-green-600 font-medium' : ''}>
                    {order.shipping_cost === 0 ? 'Gratis' : formatPrice(order.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base text-zinc-900 pt-1 border-t border-zinc-100 mt-1">
                  <span>Total</span>
                  <span className="text-[#CC3311]">{formatPrice(order.total + order.shipping_cost)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
