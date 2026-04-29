'use client'

import { useState, useCallback } from 'react'
import { useCart, FREE_SHIPPING_THRESHOLD } from '../context/CartContext'
import { supabase } from '../lib/supabase'

function formatPrice(price: number) {
  return `$${price.toLocaleString('es-CL')}`
}

const TIME_LABELS = {
  morning: 'Mañana 10:00 – 13:00',
  afternoon: 'Tarde 15:00 – 19:00',
}

const BANK = {
  bank: 'Banco de Chile',
  type: 'Cuenta Corriente',
  number: '00-123-45678-09',
  rut: '12.345.678-9',
  name: 'TMT',
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.057 23.707a.5.5 0 00.609.61l5.945-1.469A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.878 9.878 0 01-5.031-1.375l-.36-.214-3.733.922.949-3.647-.235-.374A9.865 9.865 0 012.118 12C2.118 6.534 6.534 2.118 12 2.118S21.882 6.534 21.882 12 17.466 21.882 12 21.882z" />
    </svg>
  )
}

function buildOrderMessage(
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

  const [orderSent, setOrderSent] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = useCallback((label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(label)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }, [])

  if (!confirmationOpen || !customerData) return null

  const orderMessage = buildOrderMessage(items, totalPrice, shippingCost, totalWithShipping, customerData)
  const orderUrl = `https://wa.me/56994390886?text=${encodeURIComponent(orderMessage)}`

  async function handleConfirm() {
    // Guardar en Supabase de forma silenciosa — siempre abre WhatsApp al final
    if (!customerData) return
    try {
      const datos = { customerData, items, totalPrice, shippingCost }
      console.log('Guardando pedido...', datos)

      // 1. Buscar o crear cliente por teléfono
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerData.phone)
        .maybeSingle()

      let customerId: string

      if (existing) {
        customerId = existing.id
      } else {
        const { data: created } = await supabase
          .from('customers')
          .insert({ name: customerData.name, phone: customerData.phone, address: customerData.address })
          .select('id')
          .single()
        customerId = created!.id
      }

      // 2. Crear pedido
      const { data: order } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          total: totalPrice,
          shipping_cost: shippingCost,
          delivery_date: customerData.date,
          delivery_time: customerData.time,
          status: 'pendiente',
        })
        .select('id')
        .single()

      // 3. Crear items del pedido
      if (order) {
        await supabase.from('order_items').insert(
          items.map((item) => ({
            order_id: order.id,
            product_name: item.name,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
          }))
        )
      }
      console.log('Pedido guardado:', order)
    } catch (error) {
      console.log('Error al guardar:', error)
      // Error silencioso — no bloquea el flujo del cliente
    }

    window.open(orderUrl, '_blank', 'noopener,noreferrer')
    setOrderSent(true)
  }

  function handleBack() {
    setOrderSent(false)
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
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Productos</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={`${item.name}-${item.variant}`} className="flex justify-between items-start gap-2 text-sm">
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
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-2">Datos de entrega</h3>
            <div className="space-y-1 text-sm text-zinc-700">
              <p><span className="text-zinc-400">Nombre:</span> {customerData.name}</p>
              <p><span className="text-zinc-400">Teléfono:</span> {customerData.phone}</p>
              <p><span className="text-zinc-400">Dirección:</span> {customerData.address}</p>
            </div>
          </section>

          {/* Fecha y horario */}
          <section className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-1">Fecha y horario</h3>
            <p className="text-sm font-medium text-zinc-800">{customerData.dateLabel}</p>
            <p className="text-sm text-zinc-600">{TIME_LABELS[customerData.time]}</p>
          </section>

          {/* Botón confirmar / estado enviado */}
          <div className="flex flex-col gap-3">
            {orderSent ? (
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-zinc-200 text-zinc-500 font-semibold text-sm cursor-not-allowed select-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Pedido enviado
              </div>
            ) : (
              <button
                onClick={handleConfirm}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1eba57] active:scale-95 transition-all"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                Confirmar pedido por WhatsApp
              </button>
            )}

            {/* Sección de pago — visible después de enviar */}
            {orderSent && (
              <div className="space-y-4 pt-1">
                {/* Datos bancarios */}
                <section className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-zinc-700">Datos para transferencia</h3>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('__all__', [
                        `Banco: ${BANK.bank}`,
                        `Tipo de cuenta: ${BANK.type}`,
                        `Número de cuenta: ${BANK.number}`,
                        `RUT: ${BANK.rut}`,
                        `Nombre: ${BANK.name}`,
                        `Monto: ${formatPrice(totalWithShipping)}`,
                      ].join('\n'))}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-zinc-300 text-zinc-500 hover:border-[#CC3311] hover:text-[#CC3311] transition-colors"
                    >
                      {copiedField === '__all__' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copiar todo
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-1 text-sm">
                    {[
                      ['Banco', BANK.bank],
                      ['Tipo de cuenta', BANK.type],
                      ['Número de cuenta', BANK.number],
                      ['RUT', BANK.rut],
                      ['Nombre', BANK.name],
                      ['Monto', formatPrice(totalWithShipping)],
                    ].map(([label, value]) => {
                      const copied = copiedField === label
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => copyToClipboard(label, value)}
                          className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-zinc-100 active:bg-zinc-200 transition-colors group text-left"
                        >
                          <span className="text-zinc-400 shrink-0">{label}</span>
                          <span className={`font-medium text-right ${label === 'Monto' ? 'text-[#CC3311]' : 'text-zinc-800'}`}>
                            {value}
                          </span>
                          <span className={`shrink-0 transition-colors ${copied ? 'text-green-500' : 'text-zinc-300 group-hover:text-zinc-400'}`}>
                            {copied ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Instrucción comprobante */}
                <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 leading-relaxed">
                  Una vez realizada la transferencia, envía el comprobante como imagen directamente en la conversación de WhatsApp que acabas de abrir.
                </p>
              </div>
            )}

            {!orderSent && (
              <button
                onClick={handleBack}
                className="w-full py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Volver y editar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
