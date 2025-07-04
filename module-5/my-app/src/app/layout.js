import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Ethereum Analytics Dashboard',
  description: 'Live blockchain data visualized',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}