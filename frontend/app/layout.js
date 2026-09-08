import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'Zoom - Video Conferencing, Web Conferencing, Webinars',
  description: 'Zoom is the leader in modern enterprise video communications, with an easy, reliable cloud platform for video and audio conferencing, messaging, and webinars.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
