import type { Metadata, Viewport } from 'next';
import { PreviewApiBridge } from '@/components/PreviewApiBridge';
import './globals.css';
import './v2.css';
import './v2-fixes.css';
import './v2-chat-controls.css';
import './v2.1.css';
import './v2.1-overlays.css';

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
      <body>
        <PreviewApiBridge />
        {children}
      </body>
    </html>
  );
}
