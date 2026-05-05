'use client'

import { CartProvider } from '../context/CartContext'
import Cart from './Cart'
import Checkout from './Checkout'
import Confirmation from './Confirmation'
import Footer from './Footer'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <Footer />
      <Cart />
      <Checkout />
      <Confirmation />
    </CartProvider>
  )
}
