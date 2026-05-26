import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import Header from '@/components/Header';
import DashboardLayout from '@/components/DashboardLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema de Gestión de Horarios - UNT',
  description: 'Escuela de Ingeniería de Sistemas - Universidad Nacional de Trujillo',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
