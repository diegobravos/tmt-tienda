'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
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
  const { data: session, status } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return

    setLoading(true)
    const email = session.user.email

    supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle()
      .then(({ data: customer }) => {
        if (!customer) {
          setOrders([])
          setLoading(false)
          setFetched(true)
          return
        }
        supabase
          .from('orders')
          .select('id, total, shipping_cost, delivery_date, delivery_time, status, created_at, order_items(product_name, variant, quantity, price)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(1000)
          .then(({ data }) => {
            setOrders((data as Order[]) ?? [])
            setLoading(false)
            setFetched(true)
          })
      })
  }, [status, session?.user?.email])

  // ── Cargando sesión ──
  if (status === 'loading') return null

  // ── No autenticado ──
  if (status === 'unauthenticated') {
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
          <div className="w-full max-w-sm text-center space-y-6">
            <div>
              <span className="text-5xl">🍅</span>
              <h1 className="mt-4 text-2xl font-bold text-zinc-900">Mis pedidos</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Inicia sesión para ver tus pedidos
              </p>
            </div>

            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-sm"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Iniciar sesión con Google
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Autenticado ──
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
          <div className="flex items-center gap-2">
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ''}
                className="h-8 w-8 rounded-full border-2 border-white/40"
              />
            )}
            <span className="text-sm text-white/80 hidden sm:block">
              {session?.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="text-xs text-white/70 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-full transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Cargando */}
        {(loading || !fetched) && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
          </div>
        )}

        {/* Sin pedidos */}
        {fetched && !loading && orders.length === 0 && (
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
        {fetched && !loading && orders.map(order => {
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
