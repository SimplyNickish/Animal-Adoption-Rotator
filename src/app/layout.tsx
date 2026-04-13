import '../index.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Widget Ecosystem',
  description: 'Adoption Rotator Widget for OBS/Meld',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-white h-screen w-screen overflow-hidden bg-transparent" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
