'use client'

import { useState } from 'react'
import { useCart, CustomerData } from '../context/CartContext'

function getNextWednesdays(count: number): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  const dayOfWeek = today.getDay()
  let daysUntil = (3 - dayOfWeek + 7) % 7
  // Si hoy es miércoles, saltar al siguiente
  if (daysUntil === 0) daysUntil = 7

  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + daysUntil + i * 7)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    // Capitalize first letter
    result.push({ date: iso, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return result
}

const TIME_OPTIONS = [
  { value: 'morning', label: 'Mañana  10:00 – 13:00' },
  { value: 'afternoon', label: 'Tarde  15:00 – 19:00' },
] as const

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'date' | 'time', string>>

export default function Checkout() {
  const { checkoutOpen, setCheckoutOpen, setConfirmationOpen, setCustomerData, items } = useCart()

  const wednesdays = getNextWednesdays(3)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    date: '',
    dateLabel: '',
    time: '' as '' | 'morning' | 'afternoon',
  })
  const [errors, setErrors] = useState<Errors>({})

  if (!checkoutOpen) return null

  function validate(): boolean {
    const e: Errors = {}
    if (!form.name.trim()) e.name = 'Ingresa tu nombre completo'
    if (!form.phone.trim()) e.phone = 'Ingresa tu teléfono'
    if (!form.address.trim()) e.address = 'Ingresa la dirección de entrega'
    if (!form.date) e.date = 'Selecciona una fecha'
    if (!form.time) e.time = 'Selecciona un horario'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const data: CustomerData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      date: form.date,
      dateLabel: form.dateLabel,
      time: form.time as 'morning' | 'afternoon',
    }
    setCustomerData(data)
    setCheckoutOpen(false)
    setConfirmationOpen(true)
  }

  function selectDate(iso: string, label: string) {
    setForm((f) => ({ ...f, date: iso, dateLabel: label }))
    setErrors((e) => ({ ...e, date: undefined }))
  }

  function field(id: keyof Errors, value: string, onChange: (v: string) => void, label: string, type = 'text', placeholder = '') {
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
          onChange={(e) => {
            onChange(e.target.value)
            setErrors((prev) => ({ ...prev, [id]: undefined }))
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

          {/* Campos */}
          {field('name', form.name, (v) => setForm((f) => ({ ...f, name: v })), 'Nombre completo', 'text', 'María González')}
          {field('phone', form.phone, (v) => setForm((f) => ({ ...f, phone: v })), 'Teléfono', 'tel', '+56 9 1234 5678')}
          {field('address', form.address, (v) => setForm((f) => ({ ...f, address: v })), 'Dirección de entrega', 'text', 'Calle Ejemplo 123, Santiago')}

          {/* Fecha */}
          <div>
            <p className="block text-sm font-medium text-zinc-700 mb-2">Fecha de entrega</p>
            <div className="space-y-2">
              {wednesdays.map(({ date, label }) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => selectDate(date, label)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    form.date === date
                      ? 'border-[#CC3311] bg-red-50 text-[#CC3311] font-medium'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
          </div>

          {/* Horario */}
          <div>
            <p className="block text-sm font-medium text-zinc-700 mb-2">Horario de entrega</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, time: value }))
                    setErrors((e) => ({ ...e, time: undefined }))
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
              className="flex-1 py-3 rounded-xl bg-[#CC3311] text-white text-sm font-semibold hover:bg-[#aa2a0d] active:scale-95 transition-all"
            >
              Revisar pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
