'use client'

import { createContext, useContext, useState } from 'react'

export type Product = {
  name: string
  variant: string
  price: number
  category: string
  originalPrice?: number  // presente si hay promoción activa
}

export type CartItem = Product & { quantity: number }

export type CustomerData = {
  name: string
  phone: string
  address: string
  date: string       // ISO date string (YYYY-MM-DD)
  dateLabel: string  // e.g. "Miércoles 29 de abril"
  time: 'morning' | 'afternoon'
}

export const FREE_SHIPPING_THRESHOLD = 20000
export const SHIPPING_COST = 2000

type CartContextType = {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  updateQuantity: (name: string, variant: string, delta: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  shippingCost: number
  totalWithShipping: number
  // Cart panel
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  // Checkout modal
  checkoutOpen: boolean
  setCheckoutOpen: (open: boolean) => void
  // Confirmation modal
  confirmationOpen: boolean
  setConfirmationOpen: (open: boolean) => void
  // Customer data
  customerData: CustomerData | null
  setCustomerData: (data: CustomerData) => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.name === product.name && i.variant === product.variant
      )
      if (existing) {
        return prev.map((i) =>
          i.name === product.name && i.variant === product.variant
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const clearCart = () => setItems([])

  const updateQuantity = (name: string, variant: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.name === name && i.variant === variant
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const totalWithShipping = totalPrice + shippingCost

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        shippingCost,
        totalWithShipping,
        isOpen,
        setIsOpen,
        checkoutOpen,
        setCheckoutOpen,
        confirmationOpen,
        setConfirmationOpen,
        customerData,
        setCustomerData,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
