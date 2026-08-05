import type { Metadata } from 'next';
import './globals.css';

import { AppShell } from '../components/AppShell';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Praxis — graded code, moderated answers',
  description:
    'AI-powered code assessment and moderated doubt resolution for classrooms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
