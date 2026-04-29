'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '../context/CartContext'

type Product = {
  name: string
  variant: string
  price: number
  category: string
  image: string | null
  description?: string
}

const products: Product[] = [
  // Tomates
  {
    name: 'Tomates Mix grandes', variant: '1 kg', price: 5000, category: 'Tomates', image: '/images/tomate.jpg',
    description: 'El tomate de verdad, como debe ser. Mezcla de variedades de tomates seleccionados a mano en el campo, con la madurez justa para que lleguen a tu mesa en su punto perfecto. De pulpa firme, sabor intenso y variados colores. Ideales para preparaciones caseras, ensaladas o simplemente con un chorro de aceite de oliva y sal.',
  },
  {
    name: 'Tomates Mix cherry', variant: '1 kg', price: 5500, category: 'Tomates', image: '/images/Cosecha.jpg',
    description: 'Pequeños, dulces, adictivos. Una mezcla de variedades cherry cosechados a mano en el campo, para que lleguen a tu mesa en su momento exacto de sabor. Perfectos para ensaladas coloridas, tablas de quesos o comerlos directo del paquete. Cuando los pruebes, no vas a querer volver a los del supermercado.',
  },
  {
    name: 'Tomates Mix cherry', variant: '½ kg', price: 3500, category: 'Tomates', image: '/images/cherrys_pequeños.jpg',
    description: 'Pequeños, dulces, adictivos. Una mezcla de variedades cherry cosechados a mano en el campo, para que lleguen a tu mesa en su momento exacto de sabor. Perfectos para ensaladas coloridas, tablas de quesos o comerlos directo del paquete. Cuando los pruebes, no vas a querer volver a los del supermercado.',
  },
  // Conservas
  {
    name: 'Salsa TMT', variant: '1 lt', price: 10000, category: 'Conservas', image: '/images/salsa.jpg',
    description: 'La salsa que hacía la abuela, ahora en f. Elaborada con tomates San Marzano frescos de temporada. Cocinados lentamente con respeto, paciencia y cariño. Sin conservantes ni colorantes. Una salsa honesta que transforma cualquier pasta, pizza o guiso en algo especial. Disponible en tres tamaños para que nunca te falte.',
  },
  {
    name: 'Salsa TMT', variant: '460 ml', price: 5000, category: 'Conservas', image: '/images/salsa.jpg',
    description: 'La salsa que hacía la abuela, ahora en f. Elaborada con tomates San Marzano frescos de temporada. Cocinados lentamente con respeto, paciencia y cariño. Sin conservantes ni colorantes. Una salsa honesta que transforma cualquier pasta, pizza o guiso en algo especial. Disponible en tres tamaños para que nunca te falte.',
  },
  {
    name: 'Salsa TMT', variant: '370 ml', price: 4000, category: 'Conservas', image: '/images/salsa.jpg',
    description: 'La salsa que hacía la abuela, ahora en f. Elaborada con tomates San Marzano frescos de temporada. Cocinados lentamente con respeto, paciencia y cariño. Sin conservantes ni colorantes. Una salsa honesta que transforma cualquier pasta, pizza o guiso en algo especial. Disponible en tres tamaños para que nunca te falte.',
  },
  {
    name: 'Asados TMT', variant: '460 ml', price: 6000, category: 'Conservas', image: '/images/Cosecha.jpg',
    description: 'El sabor del asado, todo el año. Tomates asados al horno lentamente hasta concentrar todo su sabor. Una conserva versátil que funciona para el picoteo, como base de salsas, acompañamiento de carnes o simplemente sobre un pan tostado. Hecha en pequeños lotes para cuidar cada detalle.',
  },
  {
    name: 'Mermelada TMT', variant: '460 ml', price: 7500, category: 'Conservas', image: '/images/tomate.jpg',
    description: 'Dulce de verdad, con fruta de verdad. Mermelada artesanal elaborada con fruta fresca de temporada, sin pectina industrial ni conservantes. Cocción lenta en pequeños lotes para preservar el sabor natural. Perfecta sobre tostadas, con queso, yogurt o como relleno de queques caseros.',
  },
  {
    name: 'Mermelada TMT', variant: '320 ml', price: 5500, category: 'Conservas', image: null,
    description: 'Dulce de verdad, con fruta de verdad. Mermelada artesanal elaborada con fruta fresca de temporada, sin pectina industrial ni conservantes. Cocción lenta en pequeños lotes para preservar el sabor natural. Perfecta sobre tostadas, con queso, yogurt o como relleno de queques caseros.',
  },
  {
    name: 'Mermelada TMT con ají', variant: '460 ml', price: 8500, category: 'Conservas', image: null,
    description: 'Para los que les gusta vivir con sabor. La misma mermelada artesanal de siempre, con el toque jjí para crear ese equilibrio perfecto entre dulce y picante. Ideal para acompañar quesos, charcutería o para darle carácter a cualquier tabla. Una vez que la pruebas, no hay vuelta atrás.',
  },
  // Frescos
  {
    name: 'Palta Hass', variant: '1 kg', price: 5000, category: 'Frescos', image: '/images/palta.jpg',
    description: 'Cultivada con respeto, cosechada en su punto. Paltas Hass producidas con prácticas agroecológicas, sin pesticidas ni químicos innecesarios. De piel rugosa y pulpa cremosa con ese sabor mantecoso que las hace únicas. Cosechadas a mano y seleccionadas una por una para que lleguen perfectas a tu mesa.',
  },
  {
    name: 'Queso Runca maduro', variant: '1 kg', price: 16000, category: 'Frescos', image: '/images/queso_maduro.jpg',
    description: 'El tiempo es el ingrediente secreto. Un queso de guarda elaborado artesanalmente en Valdivia y madurado durante 90 días. De pasta firme, sabor complejo y ese toque salado que se desarrolla solo con la paciencia del tiempo. Perfecto para tablas, rallado sobre pastas o simplemente con un buen vino tinto.',
  },
  {
    name: 'Queso Runca mantecoso', variant: '900 g', price: 13500, category: 'Frescos', image: '/images/queso_mantecoso.jpg',
    description: 'Suave, cremoso, irresistible. Queso fresco de corta maduración, elaborado con leche entera en Valdivia. De textura suave y sabor lácteo limso perfecto para el desayuno, sándwiches o para derretir sobre cualquier preparación caliente. Disponible en 500g y 900g.',
  },
  {
    name: 'Queso Runca mantecoso', variant: '500 g', price: 8500, category: 'Frescos', image: '/images/queso_mantecoso.jpg',
    description: 'Suave, cremoso, irresistible. Queso fresco de corta maduración, elaborado con leche entera en Valdivia. De textura suave y sabor lácteo limso perfecto para el desayuno, sándwiches o para derretir sobre cualquier preparación caliente. Disponible en 500g y 900g.',
  },
  // Aceites y especias
  {
    name: 'Aceite oliva mediterráneo', variant: '1 lt', price: 11000, category: 'Aceites y especias', image: '/images/Aceite_mediterraneo.jpg',
    description: 'Aceite de oliva extra virgen prensado en frío, de perfil suave y neutro que realza sin opacar. Ideal para cocinar, saltear verduras y aderezar ensaladas.',
  },
  {
    name: 'Oliu Premium', variant: '1 lt', price: 13500, category: 'Aceites y especias', image: '/images/Aceite_oliu.jpg',
    description: 'Aceite de oliva extra virgen de categoría premium, prensado en frío para preservar todos sus antioxidantes y aromas. Ideal para uso en crudo, sobre ensaladas, carpaccios, hummus o pan.',
  },
  {
    name: 'Merkén cacho cabra', variant: 'Unidad', price: 3500, category: 'Aceites y especias', image: '/images/merken_solo.jpg',
    description: 'El condimento del sur de Chile. Merkén artesanal elaborado con ají cacho de cabra ahumado y molido, una tradición mapuche con siglos de historia. Disponible en sabores ahumado, ajo, cilantro, albahaca y avellana. Úsalo para sazonar carnes, mariscos, sopas, huevos o lo que se te ocurra. Este condimento transforma cualquier plato.',
  },
  {
    name: 'Merkén cacho cabra', variant: 'Pack 3', price: 10000, category: 'Aceites y especias', image: '/images/merken.jpg',
    description: 'El condimento del sur de Chile. Merkén artesanal elaborado con ají cacho de cabra ahumado y molido, una tradición mapuche con siglos de historia. Disponible en sabores ahumado, ajo, cilantro, albahaca y avellana. Úsalo para sazonar carnes, mariscos, sopas, huevos o lo que se te ocurra. Este condimento transforma cualquier plato.',
  },
]

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
  onClose,
  onAddToCart,
}: {
  product: Product
  onClose: () => void
  onAddToCart: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-zinc-500 hover:text-zinc-800 shadow transition-colors"
        >
          ✕
        </button>

        {/* Imagen */}
        <div className="relative aspect-square w-full">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
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
        </div>

        {/* Contenido */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">{product.name}</h3>
            <p className="text-sm text-zinc-500">{product.variant}</p>
          </div>
          {product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-2xl font-bold text-[#CC3311]">{formatPrice(product.price)}</span>
            <button
              onClick={() => { onAddToCart(); onClose() }}
              className="px-4 py-2 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all"
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Selecting = { key: string; qty: number }

export default function Catalog() {
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [selecting, setSelecting] = useState<Selecting | null>(null)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const { addItem, totalItems, setIsOpen } = useCart()

  function productKey(p: Product) {
    return `${p.name}-${p.variant}`
  }

  function handleConfirm(product: Product) {
    if (!selecting) return
    addItem(product, selecting.qty)
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
                          <span className="text-xl font-bold text-[#CC3311]">
                            {formatPrice(product.price)}
                          </span>
                          <button
                            onClick={() => setSelecting({ key: productKey(product), qty: 1 })}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#CC3311] text-white text-sm font-medium hover:bg-[#aa2a0d] active:scale-95 transition-all"
                          >
                            Agregar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Modal */}
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAddToCart={() => setSelecting({ key: productKey(modalProduct), qty: 1 })}
        />
      )}
    </div>
  )
}
