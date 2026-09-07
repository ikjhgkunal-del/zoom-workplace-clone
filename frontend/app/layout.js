import './globals.css';

export const metadata = {
  title: 'Zoom - Video Conferencing, Web Conferencing, Webinars',
  description: 'Zoom is the leader in modern enterprise video communications, with an easy, reliable cloud platform for video and audio conferencing, messaging, and webinars.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
