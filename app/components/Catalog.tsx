'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'

type Product = {
  id: string
  name: string
  variant: string
  price: number
  category: string
  image: string | null
  description?: string
  active: boolean
  stock: number | null
  images_carousel: string[] | null
}

type Promotion = {
  id: string
  product_id: string
  type: 'percentage' | 'fixed'
  value: number
}

function applyDiscount(price: number, promo: Promotion): number {
  if (promo.type === 'percentage') return Math.round(price * (1 - promo.value / 100))
  return Math.max(0, price - promo.value)
}

function promoLabel(promo: Promotion): string {
  if (promo.type === 'percentage') return `${promo.value}% off`
  return `-${formatPrice(promo.value)}`
}

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null || stock > 5) return null
  if (stock === 0) return (
    <span className="self-start px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
      Agotado
    </span>
  )
  return (
    <span className="self-start flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      Últimas unidades
    </span>
  )
}

const categories = ['Todos', 'Tomates', 'Conservas', 'Frescos', 'Aceites y especias']

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  )
}

function ProductModal({
  product,
  promo,
  onClose,
  onAddToCart,
}: {
  product: Product
  promo?: Promotion
  onClose: () => void
  onAddToCart: () => void
}) {
  const allImages = [
    ...(product.image ? [product.image] : []),
    ...(product.images_carousel ?? []),
  ]
  const [carouselIndex, setCarouselIndex] = useState(0)
  const hasMultiple = allImages.length > 1
  const discountedPrice = promo ? applyDiscount(product.price, promo) : product.price

  function prev() {
    setCarouselIndex(i => (i - 1 + allImages.length) % allImages.length)
  }
  function next() {
    setCarouselIndex(i => (i + 1) % allImages.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-zinc-500 hover:text-zinc-800 shadow transition-colors"
        >
          ✕
        </button>

        {/* Imagen / carrusel */}
        <div className="relative aspect-square w-full">
          {allImages.length > 0 ? (
            <Image
              src={allImages[carouselIndex]}
              alt={`${product.name} ${carouselIndex + 1}`}
              fill
              sizes="(max-width: 640px) 100vw, 384px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#fdf6f0]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#CC3311]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {promo && (
            <span className="absolute top-3 left-3 px-6 py-2.5 rounded-full bg-yellow-400 text-zinc-900 text-2xl font-black shadow-lg">
              {promoLabel(promo)}
            </span>
          )}
          {/* Flechas */}
          {hasMultiple && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 flex items-center justify-center text-zinc-700 shadow hover:bg-white transition-colors"
                aria-label="Imagen anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 flex items-center justify-center text-zinc-700 shadow hover:bg-white transition-colors"
                aria-label="Imagen siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Indicadores de punto */}
        {hasMultiple && (
          <div className="flex justify-center gap-1.5 pt-3 pb-1">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === carouselIndex ? 'bg-[#CC3311]' : 'bg-zinc-300'}`}
                aria-label={`Ir a imagen ${i + 1}`}
              />
            ))}
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{product.name}</h3>
            <p className="text-sm text-zinc-500">{product.variant}</p>
          </div>
          {product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
          )}
          <StockBadge stock={product.stock} />
          <div className="flex items-center justify-between pt-1">
            <div>
              {promo && (
                <p className="text-sm text-zinc-400 line-through">{formatPrice(product.price)}</p>
              )}
              <span className="text-2xl font-bold text-[#CC3311]">{formatPrice(discountedPrice)}</span>
            </div>
            <button
              onClick={() => { onAddToCart(); onClose() }}
              disabled={product.stock === 0}
              className="px-4 py-2 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {product.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Selecting = { key: string; qty: number }

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([])
  const [promoMap, setPromoMap] = useState<Map<string, Promotion>>(new Map())
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [selecting, setSelecting] = useState<Selecting | null>(null)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const { addItem, totalItems, setIsOpen } = useCart()

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      supabase
        .from('products')
        .select('id, name, variant, price, category, image, description, active, stock, images_carousel')
        .eq('active', true),
      supabase
        .from('promotions')
        .select('id, product_id, type, value')
        .eq('active', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`),
    ]).then(([{ data: prods }, { data: promos }]) => {
      setProducts((prods as Product[]) ?? [])
      const map = new Map<string, Promotion>()
      for (const p of ((promos as Promotion[]) ?? [])) map.set(p.product_id, p)
      setPromoMap(map)
      setLoading(false)
    })
  }, [])

  function productKey(p: Product) {
    return `${p.name}-${p.variant}`
  }

  function toCartProduct(product: Product, promo?: Promotion) {
    if (!promo) return product
    return { ...product, price: applyDiscount(product.price, promo), originalPrice: product.price }
  }

  function handleConfirm(product: Product) {
    if (!selecting) return
    const promo = promoMap.get(product.id)
    addItem(toCartProduct(product, promo), selecting.qty)
    setSelecting(null)
  }

  const filtered =
    activeCategory === 'Todos'
      ? products
      : products.filter((p) => p.category === activeCategory)

  const grouped = categories
    .filter((c) => c !== 'Todos')
    .reduce<Record<string, Product[]>>((acc, cat) => {
      const items = filtered.filter((p) => p.category === cat)
      if (items.length) acc[cat] = items
      return acc
    }, {})

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-[#CC3311] text-white py-6 px-6 shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">TMT Tienda</h1>
            <p className="mt-0.5 text-red-100 text-sm">Productos artesanales chilenos</p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/mis-pedidos"
              className="px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              Mis pedidos
            </Link>
            <button
              onClick={() => setIsOpen(true)}
              className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Abrir carrito"
            >
            <CartIcon />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-[#CC3311] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-[#CC3311] text-white border-[#CC3311]'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-[#CC3311] hover:text-[#CC3311]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
          </div>
        )}

        {/* Productos agrupados por categoría */}
        {!loading && (
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b-2 border-[#CC3311]">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((product) => {
                    const promo = promoMap.get(product.id)
                    const displayPrice = promo ? applyDiscount(product.price, promo) : product.price

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                      >
                        {/* Imagen */}
                        <div className="relative aspect-square">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#fdf6f0]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#CC3311]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {promo && (
                            <span className="absolute top-2 left-2 px-5 py-2 rounded-full bg-yellow-400 text-zinc-900 text-2xl font-black shadow-lg">
                              {promoLabel(promo)}
                            </span>
                          )}
                        </div>

                        {/* Contenido */}
                        <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                          <span className="text-base font-medium text-zinc-800">{product.name}</span>
                          <span className="text-sm text-zinc-500">{product.variant}</span>

                          {product.description && (
                            <button
                              onClick={() => setModalProduct(product)}
                              className="self-start text-xs font-medium text-[#CC3311] hover:underline transition-colors"
                            >
                              Ver más →
                            </button>
                          )}

                          <StockBadge stock={product.stock} />

                          {selecting?.key === productKey(product) ? (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSelecting(s => s && s.qty > 1 ? { ...s, qty: s.qty - 1 } : s)}
                                  className="w-8 h-8 rounded-full border border-zinc-300 text-zinc-600 flex items-center justify-center hover:border-[#CC3311] hover:text-[#CC3311] transition-colors text-lg leading-none"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-sm font-bold text-zinc-800">
                                  {selecting.qty}
                                </span>
                                <button
                                  onClick={() => setSelecting(s => s ? { ...s, qty: s.qty + 1 } : s)}
                                  className="w-8 h-8 rounded-full border border-zinc-300 text-zinc-600 flex items-center justify-center hover:border-[#CC3311] hover:text-[#CC3311] transition-colors text-lg leading-none"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setSelecting(null)}
                                  className="px-2.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-500 text-sm hover:bg-zinc-50 transition-colors"
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={() => handleConfirm(product)}
                                  className="px-3 py-1.5 rounded-lg bg-[#CC3311] text-white text-sm font-medium hover:bg-[#aa2a0d] active:scale-95 transition-all"
                                >
                                  Agregar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div>
                                {promo && (
                                  <p className="text-xs text-zinc-400 line-through">{formatPrice(product.price)}</p>
                                )}
                                <span className="text-xl font-bold text-[#CC3311]">
                                  {formatPrice(displayPrice)}
                                </span>
                              </div>
                              <button
                                onClick={() => setSelecting({ key: productKey(product), qty: 1 })}
                                disabled={product.stock === 0}
                                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#CC3311] text-white text-sm font-medium hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Agregar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}

            {Object.keys(grouped).length === 0 && (
              <p className="text-center py-16 text-zinc-400 text-sm">
                No hay productos disponibles en esta categoría.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          promo={promoMap.get(modalProduct.id)}
          onClose={() => setModalProduct(null)}
          onAddToCart={() => setSelecting({ key: productKey(modalProduct), qty: 1 })}
        />
      )}
    </div>
  )
}
