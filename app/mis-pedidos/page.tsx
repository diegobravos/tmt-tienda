'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { supabase } from '../lib/supabase'
import { useCart, CartItem } from '../context/CartContext'
import { normalizePhone } from '../lib/phone'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Customer = {
  id: string
  name: string
  phone: string
  address: string
}

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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MisPedidosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { loadItems, setIsOpen, setPrefillCustomer } = useCart()

  // 'choose'     → pantalla de bienvenida
  // 'phone'      → formulario de teléfono (sin Google)
  // 'link-phone' → usuario Google vinculando teléfono por primera vez
  // 'orders'     → historial de pedidos
  const [view, setView] = useState<'choose' | 'phone' | 'link-phone' | 'orders'>('choose')
  const [authMethod, setAuthMethod] = useState<'phone' | 'google' | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [searching, setSearching] = useState(false)
  const googleLookupDone = useRef(false)

  // Cuando Google autentica, buscar cliente automáticamente
  useEffect(() => {
    if (status !== 'authenticated' || googleLookupDone.current) return
    googleLookupDone.current = true
    runGoogleLookup()
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOrdersForCustomer(customerId: string) {
    const { data } = await supabase
      .from('orders')
      .select('id, total, shipping_cost, delivery_date, delivery_time, status, created_at, order_items(product_name, variant, quantity, price)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100)
    setOrders((data as Order[]) ?? [])
  }

  async function runGoogleLookup() {
    setSearching(true)
    const googleId = (session as any)?.googleId as string | undefined
    const email = session?.user?.email

    let found: Customer | null = null

    // 1. Buscar por google_id (usuarios ya vinculados)
    if (googleId) {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .eq('google_id', googleId)
        .maybeSingle()
      found = data
    }

    // 2. Fallback: buscar por email (clientes existentes sin google_id)
    if (!found && email) {
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, address')
        .eq('email', email)
        .maybeSingle()
      if (data) {
        found = data
        if (googleId) {
          await supabase.from('customers').update({ google_id: googleId }).eq('id', data.id)
        }
      }
    }

    if (found) {
      setCustomer(found)
      await fetchOrdersForCustomer(found.id)
      setAuthMethod('google')
      setView('orders')
    } else {
      // Primera vez con Google: pedir teléfono para vincular historial
      setView('link-phone')
    }
    setSearching(false)
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    const phone = normalizePhone(phoneInput)
    if (!phone) {
      setPhoneError('Ingresa tu número de teléfono')
      return
    }

    setSearching(true)
    setPhoneError(null)

    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('phone', phone)
      .maybeSingle()

    if (data) {
      setCustomer(data)
      await fetchOrdersForCustomer(data.id)
      setAuthMethod('phone')
      setView('orders')
    } else {
      setPhoneError('No encontramos pedidos con ese número')
    }
    setSearching(false)
  }

  async function handleLinkPhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    const phone = normalizePhone(phoneInput)
    if (!phone) {
      setPhoneError('Ingresa tu número de teléfono')
      return
    }

    setSearching(true)
    setPhoneError(null)

    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('phone', phone)
      .maybeSingle()

    if (data) {
      const googleId = (session as any)?.googleId as string | undefined
      if (googleId) {
        await supabase.from('customers').update({ google_id: googleId }).eq('id', data.id)
      }
      setCustomer(data)
      await fetchOrdersForCustomer(data.id)
      setAuthMethod('google')
      setView('orders')
    } else {
      setPhoneError('No encontramos pedidos con ese número. Usa el mismo número que ingresaste al comprar.')
    }
    setSearching(false)
  }

  function handleReorder(order: Order) {
    const cartItems: CartItem[] = order.order_items.map(item => ({
      name: item.product_name,
      variant: item.variant,
      price: item.price,
      category: '',
      quantity: item.quantity,
    }))
    loadItems(cartItems)
    if (customer) {
      setPrefillCustomer({ name: customer.name, phone: customer.phone, address: customer.address })
    }
    setIsOpen(true)
    router.push('/')
  }

  function handleExit() {
    if (authMethod === 'google') {
      signOut({ redirect: false })
    }
    setCustomer(null)
    setOrders([])
    setView('choose')
    setAuthMethod(null)
    setPhoneInput('')
    setPhoneError(null)
    googleLookupDone.current = false
  }

  // ── Spinner de carga de sesión ──
  if (status === 'loading' || (status === 'authenticated' && searching)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
        </div>
      </div>
    )
  }

  // ── Pantalla de elección ──
  if (view === 'choose') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <PageHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <span className="text-5xl">🍅</span>
              <h1 className="mt-4 text-2xl font-bold text-zinc-900">Mis pedidos</h1>
              <p className="mt-2 text-sm text-zinc-500">¿Cómo quieres ver tus pedidos?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setView('phone')}
                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Buscar por teléfono
              </button>

              <button
                onClick={() => signIn('google')}
                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-colors shadow-sm"
              >
                <GoogleIcon />
                Iniciar sesión con Google
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Formulario de teléfono (sin Google) ──
  if (view === 'phone') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <PageHeader
          backLabel="← Volver"
          onBack={() => setView('choose')}
        />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Buscar mis pedidos</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Ingresa el número que usaste al hacer tu pedido
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phoneInput}
                  onChange={e => { setPhoneInput(e.target.value); setPhoneError(null) }}
                  placeholder="+56 9 1234 5678"
                  autoFocus
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    phoneError ? 'border-red-400 focus:border-red-500' : 'border-zinc-300 focus:border-[#CC3311]'
                  }`}
                />
                {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-60"
              >
                {searching ? 'Buscando…' : 'Ver mis pedidos'}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-400">
              ¿Tienes cuenta Google?{' '}
              <button
                onClick={() => { setView('choose'); setPhoneInput(''); setPhoneError(null) }}
                className="text-[#CC3311] hover:underline"
              >
                Volver
              </button>
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ── Vinculación teléfono (primer acceso con Google) ──
  if (view === 'link-phone') {
    const firstName = session?.user?.name?.split(' ')[0] ?? ''
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <PageHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm space-y-6">
            {/* Avatar Google */}
            {session?.user && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-200">
                {session.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    className="h-9 w-9 rounded-full border border-zinc-200"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{session.user.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{session.user.email}</p>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold text-zinc-900">
                {firstName ? `Hola, ${firstName}` : 'Hola'}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Para ver tus pedidos, ingresa el teléfono que usaste al comprar
              </p>
            </div>

            <form onSubmit={handleLinkPhoneSubmit} className="space-y-4">
              <div>
                <label htmlFor="link-phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Teléfono
                </label>
                <input
                  id="link-phone"
                  type="tel"
                  value={phoneInput}
                  onChange={e => { setPhoneInput(e.target.value); setPhoneError(null) }}
                  placeholder="+56 9 1234 5678"
                  autoFocus
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    phoneError ? 'border-red-400 focus:border-red-500' : 'border-zinc-300 focus:border-[#CC3311]'
                  }`}
                />
                {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full py-3 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-60"
              >
                {searching ? 'Verificando…' : 'Vincular y ver pedidos'}
              </button>
            </form>

            <button
              onClick={() => { signOut({ redirect: false }); setView('choose'); setPhoneInput(''); setPhoneError(null); googleLookupDone.current = false }}
              className="w-full text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Usar otra cuenta de Google
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── Historial de pedidos ──────────────────────────────────────────────────────
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
            {authMethod === 'google' && session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ''}
                className="h-8 w-8 rounded-full border-2 border-white/40"
              />
            )}
            {authMethod === 'google' && (
              <span className="text-sm text-white/80 hidden sm:block">{session?.user?.name}</span>
            )}
            {authMethod === 'phone' && customer && (
              <span className="text-sm text-white/80 hidden sm:block">{customer.phone}</span>
            )}
            <button
              onClick={handleExit}
              className="text-xs text-white/70 hover:text-white border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-full transition-colors"
            >
              {authMethod === 'google' ? 'Cerrar sesión' : 'Salir'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Sin pedidos */}
        {orders.length === 0 && (
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
        {orders.map(order => {
          const statusCfg = STATUS_CONFIG[order.status]
          const itemsSubtotal = order.order_items.reduce((s, i) => s + i.price * i.quantity, 0)

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-100">
                <div className="space-y-0.5">
                  <p className="text-xs text-zinc-400 capitalize">{formatCreatedAt(order.created_at)}</p>
                  <p className="text-xs text-zinc-400">#{order.id.slice(0, 8)}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-semibold ${statusCfg?.badge}`}>
                  {statusCfg?.label}
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

              {/* Totales + Volver a pedir */}
              <div className="px-5 py-4">
                <div className="text-sm space-y-0.5 mb-4">
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

                <button
                  onClick={() => handleReorder(order)}
                  className="w-full py-2.5 rounded-xl border-2 border-[#CC3311] text-[#CC3311] text-sm font-semibold hover:bg-red-50 active:scale-95 transition-all"
                >
                  Volver a pedir
                </button>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}

// ─── Sub-componentes de layout ────────────────────────────────────────────────

function PageHeader({
  backLabel,
  onBack,
}: {
  backLabel?: string
  onBack?: () => void
}) {
  return (
    <header className="bg-[#CC3311] text-white py-5 px-6 shadow-md">
      <div className="max-w-md mx-auto flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white transition-colors text-sm"
          >
            {backLabel ?? '← Volver'}
          </button>
        ) : (
          <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
            ← Volver
          </Link>
        )}
        <span className="text-white/40">|</span>
        <div className="bg-white rounded-lg px-2 py-1 shadow-sm">
          <Image src="/images/logo.png" alt="TMT" width={56} height={37} className="h-8 w-auto" />
        </div>
      </div>
    </header>
  )
}
