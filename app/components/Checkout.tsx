'use client'

import { useEffect, useState } from 'react'
import { useCart, CustomerData } from '../context/CartContext'
import { normalizePhone } from '../lib/phone'
import { supabase } from '../lib/supabase'

type DeliveryConfig = {
  delivery_date: string | null
  morning_available: boolean
  afternoon_available: boolean
}

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'time', string>>

function formatDeliveryLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function Checkout() {
  const {
    checkoutOpen, setCheckoutOpen,
    setConfirmationOpen, setCustomerData,
    setPrefillCustomer, prefillCustomer,
    items,
  } = useCart()

  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null | 'loading'>('loading')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    date: '',
    dateLabel: '',
    time: '' as '' | 'morning' | 'afternoon',
  })
  const [errors, setErrors] = useState<Errors>({})

  // Fetch config fresh each time checkout opens
  useEffect(() => {
    if (!checkoutOpen) return
    setDeliveryConfig('loading')
    supabase
      .from('delivery_config')
      .select('delivery_date, morning_available, afternoon_available')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        const cfg = (data as DeliveryConfig | null) ?? null
        setDeliveryConfig(cfg)
        if (cfg?.delivery_date) {
          setForm(f => ({ ...f, date: cfg.delivery_date!, dateLabel: formatDeliveryLabel(cfg.delivery_date!) }))
        } else {
          setForm(f => ({ ...f, date: '', dateLabel: '' }))
        }
      })
  }, [checkoutOpen])

  // Pre-fill from order history reorder
  useEffect(() => {
    if (!prefillCustomer) return
    setForm(f => ({ ...f, name: prefillCustomer.name, phone: prefillCustomer.phone, address: prefillCustomer.address }))
    setPrefillCustomer(null)
  }, [prefillCustomer, setPrefillCustomer])

  if (!checkoutOpen) return null

  const config = deliveryConfig !== 'loading' ? deliveryConfig : null
  const availableSlots: { value: 'morning' | 'afternoon'; label: string }[] = config
    ? [
        ...(config.morning_available ? [{ value: 'morning' as const, label: 'Mañana  10:00 – 13:00' }] : []),
        ...(config.afternoon_available ? [{ value: 'afternoon' as const, label: 'Tarde  15:00 – 19:00' }] : []),
      ]
    : []
  const deliveryAvailable =
    config !== null &&
    Boolean(config.delivery_date) &&
    availableSlots.length > 0

  function validate(): boolean {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Ingresa tu nombre completo'
    if (!form.phone.trim()) e.phone = 'Ingresa tu teléfono'
    if (!form.address.trim()) e.address = 'Ingresa la dirección de entrega'
    if (!form.time) e.time = 'Selecciona un horario'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const data: CustomerData = {
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      address: form.address.trim(),
      date: form.date,
      dateLabel: form.dateLabel,
      time: form.time as 'morning' | 'afternoon',
    }
    setCustomerData(data)
    setCheckoutOpen(false)
    setConfirmationOpen(true)
  }

  function field(
    id: keyof Errors,
    value: string,
    onChange: (v: string) => void,
    label: string,
    type = 'text',
    placeholder = '',
  ) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700 mb-1">
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => {
            onChange(e.target.value)
            setErrors(prev => ({ ...prev, [id]: undefined }))
          }}
          className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
            errors[id]
              ? 'border-red-400 focus:border-red-500'
              : 'border-zinc-300 focus:border-[#CC3311]'
          }`}
        />
        {errors[id] && <p className="mt-1 text-xs text-red-500">{errors[id]}</p>}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center overflow-y-auto bg-black/50 py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#CC3311] text-white rounded-t-2xl">
          <div>
            <p className="text-xs text-red-200 font-medium uppercase tracking-wide">Paso 3 de 4</p>
            <h2 className="text-lg font-bold leading-tight">Datos de entrega</h2>
          </div>
          <button
            onClick={() => setCheckoutOpen(false)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-5 space-y-5">
          {/* Resumen rápido */}
          <div className="bg-zinc-50 rounded-xl px-4 py-2.5 text-sm text-zinc-600">
            {items.length} producto{items.length !== 1 ? 's' : ''} en tu pedido
          </div>

          {/* Campos de cliente */}
          {field('name', form.name, v => setForm(f => ({ ...f, name: v })), 'Nombre completo', 'text', 'María González')}
          {field('phone', form.phone, v => setForm(f => ({ ...f, phone: v })), 'Teléfono', 'tel', '+56 9 1234 5678')}
          {field('address', form.address, v => setForm(f => ({ ...f, address: v })), 'Dirección de entrega', 'text', 'Calle Ejemplo 123, Santiago')}

          {/* Fecha y horario — dinámicos desde delivery_config */}
          {deliveryConfig === 'loading' ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 rounded-full border-2 border-zinc-300 border-t-[#CC3311] animate-spin" />
            </div>
          ) : !deliveryAvailable ? (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 text-center space-y-1">
              <p className="text-sm font-medium text-zinc-700">Despacho no disponible por el momento</p>
              <p className="text-xs text-zinc-400">Por favor contáctanos por WhatsApp</p>
            </div>
          ) : (
            <>
              {/* Fecha (no editable, controlada por admin) */}
              <div>
                <p className="block text-sm font-medium text-zinc-700 mb-2">Fecha de entrega</p>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#CC3311] bg-red-50 text-sm text-[#CC3311] font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="capitalize">{form.dateLabel}</span>
                </div>
              </div>

              {/* Horario — solo franjas habilitadas */}
              <div>
                <p className="block text-sm font-medium text-zinc-700 mb-2">Horario de entrega</p>
                <div className={`grid gap-2 ${availableSlots.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {availableSlots.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, time: value }))
                        setErrors(e => ({ ...e, time: undefined }))
                      }}
                      className={`px-3 py-3 rounded-xl border text-sm text-center transition-colors leading-snug ${
                        form.time === value
                          ? 'border-[#CC3311] bg-red-50 text-[#CC3311] font-medium'
                          : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.time && <p className="mt-1 text-xs text-red-500">{errors.time}</p>}
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
              className="flex-1 py-3 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Volver al carrito
            </button>
            <button
              type="submit"
              disabled={!deliveryAvailable || deliveryConfig === 'loading'}
              className="flex-1 py-3 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Revisar pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
