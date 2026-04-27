'use client'

import { useState } from 'react'
import { useCart } from '../context/CartContext'

type Product = {
  name: string
  variant: string
  price: number
  category: string
}

const products: Product[] = [
  // Tomates
  { name: 'Tomates Mix grandes', variant: '1 kg', price: 5000, category: 'Tomates' },
  { name: 'Tomates Mix cherry', variant: '1 kg', price: 5500, category: 'Tomates' },
  { name: 'Tomates Mix cherry', variant: '½ kg', price: 3500, category: 'Tomates' },
  // Conservas
  { name: 'Salsa TMT', variant: '1 lt', price: 10000, category: 'Conservas' },
  { name: 'Salsa TMT', variant: '460 ml', price: 5000, category: 'Conservas' },
  { name: 'Salsa TMT', variant: '370 ml', price: 4000, category: 'Conservas' },
  { name: 'Asados TMT', variant: '460 ml', price: 6000, category: 'Conservas' },
  { name: 'Mermelada TMT', variant: '460 ml', price: 7500, category: 'Conservas' },
  { name: 'Mermelada TMT', variant: '320 ml', price: 5500, category: 'Conservas' },
  { name: 'Mermelada TMT con ají', variant: '460 ml', price: 8500, category: 'Conservas' },
  // Frescos
  { name: 'Palta Hass', variant: '1 kg', price: 5000, category: 'Frescos' },
  { name: 'Queso Runca maduro', variant: '1 kg', price: 16000, category: 'Frescos' },
  { name: 'Queso Runca mantecoso', variant: '900 g', price: 13500, category: 'Frescos' },
  { name: 'Queso Runca mantecoso', variant: '500 g', price: 8500, category: 'Frescos' },
  // Aceites y especias
  { name: 'Aceite oliva mediterráneo', variant: '1 lt', price: 11000, category: 'Aceites y especias' },
  { name: 'Oliu Premium', variant: '1 lt', price: 13500, category: 'Aceites y especias' },
  { name: 'Merkén cacho cabra', variant: 'Unidad', price: 3500, category: 'Aceites y especias' },
  { name: 'Merkén cacho cabra', variant: 'Pack 3', price: 10000, category: 'Aceites y especias' },
]

const categories = ['Todos', 'Tomates', 'Conservas', 'Frescos', 'Aceites y especias']

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z"
      />
    </svg>
  )
}

export default function Catalog() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const { addItem, totalItems, setIsOpen } = useCart()

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

          {/* Botón carrito */}
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

        {/* Productos agrupados por categoría */}
        <div className="space-y-10">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold text-zinc-800 mb-4 pb-2 border-b-2 border-[#CC3311]">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((product, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-zinc-200 px-5 py-4 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <span className="text-base font-medium text-zinc-800">{product.name}</span>
                    <span className="text-sm text-zinc-500">{product.variant}</span>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xl font-bold text-[#CC3311]">
                        {formatPrice(product.price)}
                      </span>
                      <button
                        onClick={() => addItem(product)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#CC3311] text-white text-sm font-medium hover:bg-[#aa2a0d] active:scale-95 transition-all"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
