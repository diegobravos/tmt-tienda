import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import AppShell from './components/AppShell'
import Providers from './providers'

const montserrat = localFont({
  src: [
    { path: '../public/fonts/Montserrat-VariableFont_wght.ttf', weight: '100 900', style: 'normal' },
    { path: '../public/fonts/Montserrat-Italic-VariableFont_wght.ttf', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
})

const sourGummy = localFont({
  src: [
    { path: '../public/fonts/SourGummy-VariableFont_wdth,wght.ttf', weight: '100 900', style: 'normal' },
    { path: '../public/fonts/SourGummy-Italic-VariableFont_wdth,wght.ttf', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-sour-gummy',
  display: 'swap',
})

const ttInterphases = localFont({
  src: '../public/fonts/TT Interphases Pro Mono Trial Regular.ttf',
  variable: '--font-tt-interphases',
  weight: '400',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TMT Tienda — Productos artesanales chilenos',
  description: 'Catálogo de productos artesanales TMT: tomates, conservas, frescos, aceites y especias.',
  icons: { icon: '/images/logo.png' },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${sourGummy.variable} ${ttInterphases.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
