import type { Metadata, Viewport } from 'next';
import './globals.css';
import './v2.css';
import './v2-fixes.css';

export const metadata: Metadata = {
  title: 'Vibify — Listen together',
  description: 'Create a room and listen to the same music together, in sync.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090c'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
