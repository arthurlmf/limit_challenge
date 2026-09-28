import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';
import Shell from '@/components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: 'Fleet — Maintenance workspace',
  description: 'Manage fleet vehicles, offices, mechanics and maintenance.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppRouterCacheProvider>
          <Providers>
            <Shell>{children}</Shell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
