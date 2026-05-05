'use client'

// MIGRACIÓN PENDIENTE — ejecutar manualmente en Supabase SQL Editor:
// alter table products add column if not exists images_carousel text[];

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
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
  images_carousel: string[] | null
}

type ProductForm = Omit<Product, 'id'>

// ─── Tipos Promociones ────────────────────────────────────────────────────────

type AdminPromotion = {
  id: string
  product_id: string
  type: 'percentage' | 'fixed'
  value: number
  active: boolean
  start_date: string | null
  end_date: string | null
  products: { name: string; variant: string } | { name: string; variant: string }[] | null
}

type PromotionForm = {
  product_id: string
  type: 'percentage' | 'fixed'
  value: string
  active: boolean
  start_date: string
  end_date: string
}

const EMPTY_PROMO_FORM: PromotionForm = {
  product_id: '',
  type: 'percentage',
  value: '',
  active: true,
  start_date: '',
  end_date: '',
}

function getPromoProductInfo(p: AdminPromotion['products']): { name: string; variant: string } | null {
  if (!p) return null
  return Array.isArray(p) ? (p[0] ?? null) : p
}

function formatPromoDiscount(type: 'percentage' | 'fixed', value: number): string {
  if (type === 'percentage') return `${value}% off`
  return `-$${value.toLocaleString('es-CL')}`
}

function formatPromoDate(d: string | null): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StockCell({ stock }: { stock: number | null }) {
  if (stock === null) return <span className="text-zinc-400 text-xs font-mono">Sin límite</span>
  if (stock === 0) return <span className="text-red-600 text-xs font-mono">Agotado</span>
  if (stock <= 5) return (
    <span className="flex items-center gap-1 text-yellow-600 text-xs font-mono">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      {stock}
    </span>
  )
  return <span className="text-green-600 text-xs font-mono">{stock}</span>
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
  images_carousel: [],
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
      ? { name: product.name, variant: product.variant, price: product.price, category: product.category, image: product.image ?? '', description: product.description, active: product.active, stock: product.stock, images_carousel: product.images_carousel ?? [] }
      : { ...EMPTY_FORM }
  )
  // stockInput: string para manejar el campo vacío (= null) vs número
  const [stockInput, setStockInput] = useState<string>(
    product?.stock !== null && product?.stock !== undefined ? String(product.stock) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image ?? null)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingCarousel, setUploadingCarousel] = useState(false)
  // Solo true si el usuario agregó o eliminó imágenes del carrusel en esta sesión
  const [carouselDirty, setCarouselDirty] = useState(false)
  const mainFileRef = useRef<HTMLInputElement>(null)
  const carouselFileRef = useRef<HTMLInputElement>(null)
  // ID estable para nombrar archivos (nuevo producto usa timestamp)
  const sessionId = useRef(product?.id ?? `new-${Date.now()}`).current

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleMainImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Previsualización local inmediata
    const localUrl = URL.createObjectURL(file)
    setImagePreview(localUrl)

    setUploadingMain(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${sessionId}-main-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError(`Error subiendo imagen: ${uploadError.message}`)
      setUploadingMain(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    set('image', urlData.publicUrl)
    setUploadingMain(false)
  }

  async function handleCarouselImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCarousel(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${sessionId}-carousel-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError(`Error subiendo imagen: ${uploadError.message}`)
      setUploadingCarousel(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    set('images_carousel', [...(form.images_carousel ?? []), urlData.publicUrl])
    setCarouselDirty(true)
    setUploadingCarousel(false)
    if (carouselFileRef.current) carouselFileRef.current.value = ''
  }

  function removeCarouselImage(index: number) {
    set('images_carousel', (form.images_carousel ?? []).filter((_, i) => i !== index))
    setCarouselDirty(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.variant.trim()) {
      setError('Nombre y variante son obligatorios.')
      return
    }
    setSaving(true)
    setError('')

    const basePayload = {
      name: form.name.trim(),
      variant: form.variant.trim(),
      price: form.price,
      category: form.category,
      image: form.image?.trim() || null,
      description: form.description.trim(),
      active: form.active,
      stock: stockInput.trim() === '' ? null : Math.max(0, parseInt(stockInput, 10)),
    }

    // Solo incluir images_carousel si el usuario lo modificó o es un producto nuevo
    const payload = (carouselDirty || !product)
      ? { ...basePayload, images_carousel: form.images_carousel && form.images_carousel.length > 0 ? form.images_carousel : null }
      : basePayload

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
          <h2 className="font-display font-bold text-zinc-900">
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
            <label className="block text-xs font-mono text-zinc-600 mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
            />
          </div>

          {/* Variante */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-1">Variante</label>
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
              <label className="block text-xs font-mono text-zinc-600 mb-1">Precio (CLP)</label>
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
              <label className="block text-xs font-mono text-zinc-600 mb-1">Categoría</label>
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
            <label className="block text-xs font-mono text-zinc-600 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311] resize-none"
            />
          </div>

          {/* Imagen principal */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-2">Imagen principal</label>
            {imagePreview && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-zinc-100 mb-3">
                <Image
                  src={imagePreview}
                  alt="Vista previa"
                  fill
                  sizes="(max-width: 640px) 100vw, 512px"
                  style={{ objectFit: 'cover' }}
                />
                {uploadingMain && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  </div>
                )}
              </div>
            )}
            <input
              ref={mainFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMainImageChange}
            />
            <button
              type="button"
              onClick={() => mainFileRef.current?.click()}
              disabled={uploadingMain}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 text-zinc-600 text-sm hover:border-[#CC3311] hover:text-[#CC3311] disabled:opacity-50 transition-colors"
            >
              {uploadingMain ? 'Subiendo...' : 'Cambiar imagen principal'}
            </button>
          </div>

          {/* Carrusel de imágenes */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-2">Carrusel de imágenes</label>
            {form.images_carousel && form.images_carousel.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.images_carousel.map((url, i) => (
                  <div key={i} className="relative">
                    <Image
                      src={url}
                      alt={`Carrusel ${i + 1}`}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover border border-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeCarouselImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={carouselFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCarouselImageAdd}
            />
            <button
              type="button"
              onClick={() => carouselFileRef.current?.click()}
              disabled={uploadingCarousel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 text-zinc-600 text-sm hover:border-[#CC3311] hover:text-[#CC3311] disabled:opacity-50 transition-colors"
            >
              {uploadingCarousel ? 'Subiendo...' : '+ Agregar imagen al carrusel'}
            </button>
          </div>

          {/* Stock + Activo */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-mono text-zinc-600 mb-1">Stock</label>
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
              <span className="text-sm font-mono text-zinc-700">Activo</span>
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
      .select('id, name, variant, price, category, image, description, active, stock, images_carousel')
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
                <th className="text-left px-4 py-3 font-mono text-zinc-500 w-12">Img</th>
                <th className="text-left px-4 py-3 font-mono text-zinc-500">Nombre</th>
                <th className="text-left px-4 py-3 font-mono text-zinc-500 hidden sm:table-cell">Variante</th>
                <th className="text-left px-4 py-3 font-mono text-zinc-500 hidden md:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-mono text-zinc-500">Precio</th>
                <th className="text-center px-4 py-3 font-mono text-zinc-500">Stock</th>
                <th className="text-center px-4 py-3 font-mono text-zinc-500">Activo</th>
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

// ─── Modal de promoción ───────────────────────────────────────────────────────

function PromotionModal({
  promotion,
  onClose,
  onSaved,
}: {
  promotion: AdminPromotion | null  // null = nueva
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<PromotionForm>(
    promotion
      ? {
          product_id: promotion.product_id,
          type: promotion.type,
          value: String(promotion.value),
          active: promotion.active,
          start_date: promotion.start_date ?? '',
          end_date: promotion.end_date ?? '',
        }
      : { ...EMPTY_PROMO_FORM }
  )
  const [activeProducts, setActiveProducts] = useState<{ id: string; name: string; variant: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, variant')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setActiveProducts((data ?? []) as { id: string; name: string; variant: string }[]))
  }, [])

  function set<K extends keyof PromotionForm>(key: K, value: PromotionForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setError('')
    if (!form.product_id) { setError('Selecciona un producto.'); return }
    const numVal = Number(form.value)
    if (!form.value || isNaN(numVal) || numVal <= 0) { setError('Ingresa un valor de descuento válido.'); return }
    if (form.type === 'percentage' && (numVal < 1 || numVal > 100)) { setError('El porcentaje debe estar entre 1 y 100.'); return }

    setSaving(true)
    const payload = {
      product_id: form.product_id,
      type: form.type,
      value: numVal,
      active: form.active,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }
    const { error: dbError } = promotion
      ? await supabase.from('promotions').update(payload).eq('id', promotion.id)
      : await supabase.from('promotions').insert(payload)

    if (dbError) { setError(dbError.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="font-display font-bold text-zinc-900">
            {promotion ? 'Editar promoción' : 'Nueva promoción'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Producto */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-1">Producto</label>
            <select
              value={form.product_id}
              onChange={e => set('product_id', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
            >
              <option value="">Selecciona un producto…</option>
              {activeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.variant}</option>
              ))}
            </select>
          </div>

          {/* Tipo de descuento */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-2">Tipo de descuento</label>
            <div className="flex gap-3">
              {(['percentage', 'fixed'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="promo-type"
                    value={t}
                    checked={form.type === t}
                    onChange={() => set('type', t)}
                    className="accent-[#CC3311]"
                  />
                  <span className="text-sm text-zinc-700">
                    {t === 'percentage' ? 'Porcentaje (%)' : 'Monto fijo ($)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-mono text-zinc-600 mb-1">
              {form.type === 'percentage' ? 'Porcentaje de descuento (1–100)' : 'Monto a descontar (CLP)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                {form.type === 'percentage' ? '%' : '$'}
              </span>
              <input
                type="number"
                min={1}
                max={form.type === 'percentage' ? 100 : undefined}
                step={form.type === 'percentage' ? 1 : 100}
                value={form.value}
                onChange={e => set('value', e.target.value)}
                placeholder={form.type === 'percentage' ? '10' : '1000'}
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-600 mb-1">Fecha inicio (opcional)</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-600 mb-1">Fecha término (opcional)</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#CC3311]"
              />
            </div>
          </div>

          {/* Activo */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-mono text-zinc-700">Activa</span>
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

// ─── Sección Promociones ──────────────────────────────────────────────────────

function PromotionsSection() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPromo, setEditingPromo] = useState<AdminPromotion | null | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('promotions')
      .select('id, product_id, type, value, active, start_date, end_date, products(name, variant)')
      .order('created_at', { ascending: false })
    setPromotions((data as AdminPromotion[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  async function toggleActive(promo: AdminPromotion) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id)
    setPromotions(ps => ps.map(p => p.id === promo.id ? { ...p, active: !p.active } : p))
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('promotions').delete().eq('id', id)
    setPromotions(ps => ps.filter(p => p.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {loading ? 'Cargando...' : `${promotions.length} promoción${promotions.length !== 1 ? 'es' : ''}`}
        </p>
        <button
          onClick={() => setEditingPromo(null)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] transition-colors"
        >
          + Nueva promoción
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left px-4 py-3 font-mono text-zinc-500">Producto</th>
                <th className="text-left px-4 py-3 font-mono text-zinc-500">Descuento</th>
                <th className="text-left px-4 py-3 font-mono text-zinc-500 hidden md:table-cell">Vigencia</th>
                <th className="text-center px-4 py-3 font-mono text-zinc-500">Activa</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {promotions.map(promo => {
                const prod = getPromoProductInfo(promo.products)
                const isDeleting = deletingId === promo.id
                const startFmt = formatPromoDate(promo.start_date)
                const endFmt = formatPromoDate(promo.end_date)
                const vigencia = startFmt && endFmt
                  ? `${startFmt} – ${endFmt}`
                  : startFmt
                    ? `Desde ${startFmt}`
                    : endFmt
                      ? `Hasta ${endFmt}`
                      : 'Sin límite'

                return (
                  <tr key={promo.id} className="hover:bg-zinc-50 transition-colors">
                    {/* Producto */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-800">{prod?.name ?? '—'}</p>
                      <p className="text-xs text-zinc-400">{prod?.variant}</p>
                    </td>

                    {/* Descuento */}
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-full bg-red-50 text-[#CC3311] text-xs font-mono">
                        {formatPromoDiscount(promo.type, promo.value)}
                      </span>
                    </td>

                    {/* Vigencia */}
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{vigencia}</td>

                    {/* Toggle activo */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(promo)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${promo.active ? 'bg-[#CC3311]' : 'bg-zinc-300'}`}
                        title={promo.active ? 'Desactivar' : 'Activar'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${promo.active ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingPromo(promo)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 text-xs font-medium hover:border-[#CC3311] hover:text-[#CC3311] transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting ? '…' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {promotions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-400 text-sm">
                    No hay promociones. Crea la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingPromo !== undefined && (
        <PromotionModal
          promotion={editingPromo}
          onClose={() => setEditingPromo(undefined)}
          onSaved={fetchPromotions}
        />
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<'pedidos' | 'productos' | 'promociones' | 'despacho'>('pedidos')

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
            <Image src="/images/logo.png" alt="TMT" width={56} height={37} className="h-9 w-auto" />
            <h1 className="font-display font-bold text-zinc-900 hidden sm:block">Panel de administración</h1>
          </div>
          {/* Nav secciones */}
          <nav className="flex rounded-xl border border-zinc-200 overflow-hidden text-sm">
            <button
              onClick={() => setSection('pedidos')}
              className={`px-4 py-2 font-mono transition-colors ${section === 'pedidos' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setSection('productos')}
              className={`px-4 py-2 font-mono transition-colors ${section === 'productos' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Productos
            </button>
            <button
              onClick={() => setSection('promociones')}
              className={`px-4 py-2 font-mono transition-colors ${section === 'promociones' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Promociones
            </button>
            <button
              onClick={() => setSection('despacho')}
              className={`px-4 py-2 font-mono transition-colors ${section === 'despacho' ? 'bg-[#CC3311] text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
            >
              Despacho
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
                    className={`px-3 py-2 font-mono capitalize transition-colors ${
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
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-mono ${status?.badge}`}>
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

        {/* ── Sección Promociones ── */}
        {section === 'promociones' && <PromotionsSection />}

        {/* ── Sección Despacho ── */}
        {section === 'despacho' && <DeliveryConfigSection />}

      </main>
    </div>
  )
}

// ─── Sección configuración de despacho ───────────────────────────────────────

type DeliveryConfig = {
  delivery_date: string | null
  morning_available: boolean
  afternoon_available: boolean
}

function DeliveryConfigSection() {
  const [config, setConfig] = useState<DeliveryConfig>({
    delivery_date: null,
    morning_available: true,
    afternoon_available: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  useEffect(() => {
    supabase
      .from('delivery_config')
      .select('delivery_date, morning_available, afternoon_available')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConfig(data as DeliveryConfig)
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveStatus('idle')
    const { error } = await supabase
      .from('delivery_config')
      .upsert({
        id: 1,
        delivery_date: config.delivery_date || null,
        morning_available: config.morning_available,
        afternoon_available: config.afternoon_available,
        updated_at: new Date().toISOString(),
      })
    setSaving(false)
    if (error) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#CC3311]' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
      </div>
    )
  }

  const previewDate = config.delivery_date
    ? new Date(config.delivery_date + 'T12:00:00')
        .toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
        .replace(/^./, c => c.toUpperCase())
    : null

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden max-w-lg">
      <div className="px-6 py-5 border-b border-zinc-100">
        <h2 className="font-display font-bold text-zinc-900">Configuración de despacho</h2>
        <p className="text-sm text-zinc-500 mt-0.5 font-mono">
          Fecha y franjas horarias del próximo despacho
        </p>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Fecha */}
        <div className="space-y-2">
          <label className="block text-xs font-mono text-zinc-600">Fecha del próximo despacho</label>
          <input
            type="date"
            value={config.delivery_date ?? ''}
            onChange={e => setConfig(c => ({ ...c, delivery_date: e.target.value || null }))}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#CC3311] focus:border-transparent"
          />
          {config.delivery_date && (
            <button
              type="button"
              onClick={() => setConfig(c => ({ ...c, delivery_date: null }))}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              ✕ Borrar fecha
            </button>
          )}
        </div>

        {/* Franjas horarias */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-zinc-600">Franjas horarias disponibles</p>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-800">Mañana</p>
              <p className="text-xs font-mono text-zinc-500">10:00 – 13:00</p>
            </div>
            <Toggle
              checked={config.morning_available}
              onChange={() => setConfig(c => ({ ...c, morning_available: !c.morning_available }))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-200">
            <div>
              <p className="text-sm font-medium text-zinc-800">Tarde</p>
              <p className="text-xs font-mono text-zinc-500">15:00 – 19:00</p>
            </div>
            <Toggle
              checked={config.afternoon_available}
              onChange={() => setConfig(c => ({ ...c, afternoon_available: !c.afternoon_available }))}
            />
          </div>
        </div>

        {/* Vista previa */}
        <div className="bg-zinc-50 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-mono text-zinc-400 mb-2">Vista previa para el cliente</p>
          {previewDate && (config.morning_available || config.afternoon_available) ? (
            <div className="text-sm space-y-1">
              <p className="text-zinc-700 font-medium capitalize">{previewDate}</p>
              {config.morning_available && (
                <p className="text-zinc-500 font-mono text-xs">Mañana 10:00 – 13:00</p>
              )}
              {config.afternoon_available && (
                <p className="text-zinc-500 font-mono text-xs">Tarde 15:00 – 19:00</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">Despacho no disponible por el momento</p>
          )}
        </div>

        {/* Guardar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
          {saveStatus === 'saved' && (
            <span className="text-sm font-mono text-green-600 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Guardado
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm font-mono text-red-500">Error al guardar</span>
          )}
        </div>
      </div>
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
            <div className="flex justify-center">
              <Image src="/images/logo.png" alt="TMT" width={96} height={64} className="h-14 w-auto" />
            </div>
            <h1 className="mt-3 font-display text-xl font-bold text-zinc-900">Panel de administración</h1>
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
