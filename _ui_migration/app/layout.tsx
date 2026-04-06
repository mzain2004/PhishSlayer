import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Phish-Slayer | Cybersecurity SPA',
  description: 'Neutralize threats instantly. Eliminate dwell time forever.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-black text-white font-inter antialiased selection:bg-[#2DD4BF]/30 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

