'use client'

import { useCart, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../context/CartContext'

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

export default function Cart() {
  const { items, updateQuantity, totalPrice, isOpen, setIsOpen, setCheckoutOpen } = useCart()
  const freeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel deslizante */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del carrito */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-[#CC3311] text-white">
          <h2 className="text-lg font-bold">Tu pedido</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Cerrar carrito"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-14 w-14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z"
                />
              </svg>
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.name}-${item.variant}`}
                className="flex items-start gap-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 leading-snug">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.variant}</p>
                  {item.originalPrice && (
                    <p className="text-xs text-zinc-400 line-through">
                      {formatPrice(item.originalPrice * item.quantity)}
                    </p>
                  )}
                  <p className="text-sm font-bold text-[#CC3311] mt-0.5">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.name, item.variant, -1)}
                    className="w-7 h-7 rounded-full border border-zinc-300 text-zinc-600 flex items-center justify-center hover:border-[#CC3311] hover:text-[#CC3311] transition-colors text-lg leading-none"
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-zinc-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.name, item.variant, 1)}
                    className="w-7 h-7 rounded-full border border-zinc-300 text-zinc-600 flex items-center justify-center hover:border-[#CC3311] hover:text-[#CC3311] transition-colors text-lg leading-none"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con total y acciones */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-200 space-y-3">
            {/* Badge despacho */}
            <div
              className={`text-xs font-medium px-3 py-1.5 rounded-full text-center ${
                freeShipping
                  ? 'bg-green-100 text-green-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {freeShipping
                ? '¡Despacho gratis!'
                : `Despacho ${formatPrice(SHIPPING_COST)} — faltan ${formatPrice(FREE_SHIPPING_THRESHOLD - totalPrice)} para despacho gratis`}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600">Total</span>
              <span className="text-xl font-bold text-zinc-900">{formatPrice(totalPrice)}</span>
            </div>

            {/* Botón continuar */}
            <button
              onClick={() => { setIsOpen(false); setCheckoutOpen(true) }}
              className="w-full py-3 rounded-xl bg-[#CC3311] text-white font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </>
  )
}
