'use client'

import { useCart, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../context/CartContext'

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

const TIME_LABELS = {
  morning: 'Mañana 10:00 – 13:00',
  afternoon: 'Tarde 15:00 – 19:00',
}

function buildWhatsAppMessage(
  items: ReturnType<typeof useCart>['items'],
  totalPrice: number,
  shippingCost: number,
  totalWithShipping: number,
  customerData: NonNullable<ReturnType<typeof useCart>['customerData']>
): string {
  const lines: string[] = []

  lines.push('¡Hola! Quiero hacer un pedido TMT 🍅')
  lines.push('')
  lines.push('*Productos:*')
  for (const item of items) {
    lines.push(`• ${item.name} (${item.variant}) x${item.quantity} — ${formatPrice(item.price * item.quantity)}`)
  }
  lines.push('')
  lines.push(`*Subtotal:* ${formatPrice(totalPrice)}`)
  lines.push(`*Despacho:* ${shippingCost === 0 ? 'Gratis 🎉' : formatPrice(shippingCost)}`)
  lines.push(`*TOTAL:* ${formatPrice(totalWithShipping)}`)
  lines.push('')
  lines.push('*Datos de entrega:*')
  lines.push(`Nombre: ${customerData.name}`)
  lines.push(`Teléfono: ${customerData.phone}`)
  lines.push(`Dirección: ${customerData.address}`)
  lines.push('')
  lines.push('*Fecha y horario:*')
  lines.push(`${customerData.dateLabel} — ${TIME_LABELS[customerData.time]}`)

  return lines.join('\n')
}

export default function Confirmation() {
  const {
    confirmationOpen,
    setConfirmationOpen,
    setCheckoutOpen,
    items,
    totalPrice,
    shippingCost,
    totalWithShipping,
    customerData,
  } = useCart()

  if (!confirmationOpen || !customerData) return null

  const message = buildWhatsAppMessage(items, totalPrice, shippingCost, totalWithShipping, customerData)
  const whatsappUrl = `https://wa.me/56994390886?text=${encodeURIComponent(message)}`

  function handleBack() {
    setConfirmationOpen(false)
    setCheckoutOpen(true)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center overflow-y-auto bg-black/50 py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#CC3311] text-white rounded-t-2xl">
          <p className="text-xs text-red-200 font-medium uppercase tracking-wide">Paso 4 de 4</p>
          <h2 className="text-lg font-bold leading-tight">Confirma tu pedido</h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Productos */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Productos
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.name}-${item.variant}`}
                  className="flex justify-between items-start gap-2 text-sm"
                >
                  <div className="text-zinc-700">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-zinc-400"> ({item.variant})</span>
                    <span className="text-zinc-500"> × {item.quantity}</span>
                  </div>
                  <span className="font-semibold text-zinc-800 shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Totales */}
          <section className="bg-zinc-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Subtotal</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Despacho</span>
              <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
              </span>
            </div>
            {shippingCost === 0 && (
              <p className="text-xs text-green-600">
                ¡Superaste los {formatPrice(FREE_SHIPPING_THRESHOLD)} — despacho gratis!
              </p>
            )}
            <div className="flex justify-between font-bold text-base text-zinc-900 pt-1 border-t border-zinc-200">
              <span>Total</span>
              <span className="text-[#CC3311]">{formatPrice(totalWithShipping)}</span>
            </div>
          </section>

          {/* Datos del cliente */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Datos de entrega
            </h3>
            <div className="space-y-1 text-sm text-zinc-700">
              <p><span className="text-zinc-400">Nombre:</span> {customerData.name}</p>
              <p><span className="text-zinc-400">Teléfono:</span> {customerData.phone}</p>
              <p><span className="text-zinc-400">Dirección:</span> {customerData.address}</p>
            </div>
          </section>

          {/* Fecha y horario */}
          <section className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-1">
              Fecha y horario
            </h3>
            <p className="text-sm font-medium text-zinc-800">{customerData.dateLabel}</p>
            <p className="text-sm text-zinc-600">{TIME_LABELS[customerData.time]}</p>
          </section>

          {/* Botones */}
          <div className="flex flex-col gap-3 pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1eba57] active:scale-95 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.707a.5.5 0 00.609.61l5.945-1.469A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.878 9.878 0 01-5.031-1.375l-.36-.214-3.733.922.949-3.647-.235-.374A9.865 9.865 0 012.118 12C2.118 6.534 6.534 2.118 12 2.118S21.882 6.534 21.882 12 17.466 21.882 12 21.882z"/>
              </svg>
              Confirmar pedido por WhatsApp
            </a>
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Volver y editar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
