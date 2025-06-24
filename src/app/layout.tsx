import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StudyBuddy AI - Jouw persoonlijke AI-tutor',
  description: 'Upload studiemateriaal en laat AI gepersonaliseerde quiz vragen maken voor universitaire studies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-gray-100 min-h-screen" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}