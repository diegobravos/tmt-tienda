'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import Image from 'next/image'
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

type Product = {
  id: string
  name: string
  variant: string
  price: number
  category: string
  image: string | null
  description: string
  active: boolean
  stock: number | null
}

type ProductForm = Omit<Product, 'id'>

function StockCell({ stock }: { stock: number | null }) {
  if (stock === null) return <span className="text-zinc-400 text-xs">Sin límite</span>
  if (stock === 0) return <span className="text-red-600 text-xs font-semibold">Agotado</span>
  if (stock <= 5) return (
    <span className="flex items-center gap-1 text-yellow-600 text-xs font-semibold">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {stock}
    </span>
  )
  return <span className="text-green-600 text-xs font-semibold">{stock}</span>
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

const PRODUCT_CATEGORIES = ['Conservas', 'Frescos', 'Aceites y especias', 'Tomates']

const EMPTY_FORM: ProductForm = {
  name: '',
  variant: '',
  price: 0,
  category: 'Conservas',
  image: '',
  description: '',
  active: true,
  stock: null,
}

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

// ─── Modal de producto ────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null  // null = nuevo producto
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProductForm>(
    product
      ? { name: product.name, variant: product.variant, price: product.price, category: product.category, image: product.image ?? '', description: product.description, active: product.active, stock: product.stock }
      : { ...EMPTY_FORM }
  )
  // stockInput: string para manejar el campo vacío (= null) vs número
  const [stockInput, setStockInput] = useState<string>(
    product?.stock !== null && product?.stock !== undefined ? String(product.stock) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.variant.trim()) {
      setError('Nombre y variante son obligatorios.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      variant: form.variant.trim(),
      price: form.price,
      category: form.category,
      image: form.image?.trim() || null,
      description: form.description.trim(),
      active: form.active,
      stock: stockInput.trim() === '' ? null : Math.max(0, parseInt(stockInput, 10)),
    }

    const { error: dbError } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="font-bold text-zinc-900">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
            />
          </div>

          {/* Variante */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Variante</label>
            <input
              type="text"
              value={form.variant}
              onChange={e => set('variant', e.target.value)}
              placeholder="ej. 1 kg, 460 ml, Pack 3"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
            />
          </div>

          {/* Precio + Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Precio (CLP)</label>
              <input
                type="number"
                min={0}
                step={100}
                value={form.price}
                onChange={e => set('price', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Categoría</label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              >
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311] resize-none"
            />
          </div>

          {/* URL imagen */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">URL de imagen</label>
            <input
              type="text"
              value={form.image ?? ''}
              onChange={e => set('image', e.target.value)}
              placeholder="/images/producto.jpg"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
            />
          </div>

          {/* Stock + Activo */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Stock</label>
              <input
                type="number"
                min={0}
                step={1}
                value={stockInput}
                onChange={e => setStockInput(e.target.value)}
                placeholder="Sin límite"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              />
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-sm font-medium text-zinc-700">Activo</span>
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-[#CC3311]' : 'bg-zinc-300'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-600 text-sm hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sección Productos ────────────────────────────────────────────────────────

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined) // undefined = modal cerrado, null = nuevo

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, variant, price, category, image, description, active, stock')
      .order('category')
      .order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  async function toggleActive(product: Product) {
    await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id)
    setProducts(ps => ps.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {loading ? 'Cargando...' : `${products.length} producto${products.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={() => setEditingProduct(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
        </div>
      )}

      {/* Tabla */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left px-4 py-3 font-medium text-zinc-500 w-12">Img</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden sm:table-cell">Variante</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 hidden md:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500">Precio</th>
                <th className="text-center px-4 py-3 font-medium text-zinc-500">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-zinc-500">Activo</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                  {/* Imagen */}
                  <td className="px-4 py-3">
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="36px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-3 font-medium text-zinc-800">
                    {product.name}
                    <span className="sm:hidden text-zinc-400 font-normal"> · {product.variant}</span>
                  </td>

                  {/* Variante */}
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{product.variant}</td>

                  {/* Categoría */}
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{product.category}</td>

                  {/* Precio */}
                  <td className="px-4 py-3 text-right font-medium text-zinc-800">
                    {formatPrice(product.price)}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-center">
                    <StockCell stock={product.stock} />
                  </td>

                  {/* Toggle activo */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(product)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${product.active ? 'bg-[#CC3311]' : 'bg-zinc-300'}`}
                      title={product.active ? 'Desactivar' : 'Activar'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${product.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </td>

                  {/* Editar */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 text-xs font-medium hover:border-[#CC3311] hover:text-[#CC3311] transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400 text-sm">
                    No hay productos. Crea el primero.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {editingProduct !== undefined && (
        <ProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<'pedidos' | 'productos'>('pedidos')

  // ── Estado pedidos ──
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

  async function adjustStock(items: OrderItem[], delta: number) {
    await Promise.all(
      items.map(async (item) => {
        try {
          const { data } = await supabase
            .from('products')
            .select('id, stock')
            .eq('name', item.product_name)
            .eq('variant', item.variant)
            .single()
          if (!data || data.stock === null) return
          const newStock = Math.max(0, data.stock + delta * item.quantity)
          await supabase.from('products').update({ stock: newStock }).eq('id', data.id)
        } catch {
          // No bloquear el cambio de estado si falla una actualización de stock
        }
      })
    )
  }

  async function updateStatus(order: Order, newStatus: string) {
    setUpdating(prev => new Set(prev).add(order.id))

    // Actualizar estado del pedido
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)

    // Ajustar stock: descontar al despachar, devolver al revertir desde despachado
    const goingOut = newStatus === 'despachado' && order.status !== 'despachado'
    const comingBack = order.status === 'despachado' && newStatus !== 'despachado'
    if (goingOut) await adjustStock(order.order_items, -1)
    else if (comingBack) await adjustStock(order.order_items, 1)

    await fetchOrders()
    setUpdating(prev => { const s = new Set(prev); s.delete(order.id); return s })
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍅</span>
            <h1 className="font-bold text-zinc-900 hidden sm:block">Panel de administración TMT</h1>
          </div>
          {/* Nav secciones */}
          <nav className="flex rounded-xl border border-zinc-200 overflow-hidden text-sm">
            <button
              onClick={() => setSection('pedidos')}
              className={`px-4 py-2 font-medium transition-colors ${section === 'pedidos' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setSection('productos')}
              className={`px-4 py-2 font-medium transition-colors ${section === 'productos' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Productos
            </button>
          </nav>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Sección Pedidos ── */}
        {section === 'pedidos' && (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-3">
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
                      <p className="text-xs text-zinc-400">#{order.id.slice(0, 8)}</p>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2 text-sm text-zinc-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="capitalize font-medium">{formatDate(order.delivery_date)}</span>
                    <span className="text-zinc-400">·</span>
                    <span>{TIME_LABELS[order.delivery_time] ?? order.delivery_time}</span>
                  </div>

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

                  <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4">
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

                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pendiente' && (
                        <>
                          <button
                            onClick={() => updateStatus(order, 'pagado')}
                            disabled={isUpdating}
                            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUpdating ? '...' : 'Marcar como pagado'}
                          </button>
                          <button
                            onClick={() => updateStatus(order, 'despachado')}
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
                            onClick={() => updateStatus(order, 'despachado')}
                            disabled={isUpdating}
                            className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUpdating ? '...' : 'Marcar como despachado'}
                          </button>
                          <button
                            onClick={() => updateStatus(order, 'pendiente')}
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
                            onClick={() => updateStatus(order, 'pagado')}
                            disabled={isUpdating}
                            className="px-3 py-2 rounded-xl border border-zinc-300 text-zinc-500 text-xs hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUpdating ? '...' : 'Revertir a pagado'}
                          </button>
                          <button
                            onClick={() => updateStatus(order, 'pendiente')}
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
          </>
        )}

        {/* ── Sección Productos ── */}
        {section === 'productos' && <ProductsSection />}

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
