'use client'

import { CartProvider } from '../context/CartContext'
import Cart from './Cart'
import Checkout from './Checkout'
import Confirmation from './Confirmation'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <Cart />
      <Checkout />
      <Confirmation />
    </CartProvider>
  )
}
