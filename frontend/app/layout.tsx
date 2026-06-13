import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Run Empire — Delhi NCR Real-Time Territory Control Game',
  description: 'A real-time, multiplayer territory-control web application overlaid on the Delhi NCR map. Sign in, claim neighborhoods, and battle for dominance!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark overflow-hidden select-none">
      <body className={`${inter.className} min-h-full bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
