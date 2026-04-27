'use client'

import { useState } from 'react'

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

export default function Catalog() {
  const [activeCategory, setActiveCategory] = useState('Todos')

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
      <header className="bg-[#CC3311] text-white py-8 px-6 shadow-md">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight">TMT Tienda</h1>
          <p className="mt-1 text-red-100 text-sm">Productos artesanales chilenos</p>
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
                    <span className="mt-2 text-xl font-bold text-[#CC3311]">
                      {formatPrice(product.price)}
                    </span>
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
