'use client'

import React from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import '../styles/globals.css'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ReactFlowProvider>{children}</ReactFlowProvider>
      </body>
    </html>
  )
}
