'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Loading } from './common';
const links = [
  ['/vehicles', 'Vehicles'],
  ['/maintenance-due', 'Maintenance due'],
  ['/offices', 'Offices'],
  ['/mechanics', 'Mechanics'],
];
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();
  const isLogin = path === '/login';

  useEffect(() => {
    if (session.status === 'anonymous' && !isLogin) {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [session.status, isLogin, router]);

  return (
    <>
      <Box
        component="header"
        sx={{ bgcolor: '#102a28', color: 'white', borderBottom: '3px solid #bbdd8c' }}
      >
        <Container maxWidth="xl">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            gap={2}
            py={2}
          >
            <Link href="/vehicles" className="brand">
              <span className="brand-mark">F</span>Fleet
              <span className="brand-light"> / maintenance</span>
            </Link>
            {session.status === 'authenticated' && (
              <Box
                component="nav"
                aria-label="Main navigation"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexWrap: 'wrap',
                  ml: { md: 'auto' },
                }}
              >
                {links.map(([href, label]) => (
                  <Button
                    component={Link}
                    href={href}
                    key={href}
                    aria-current={path.startsWith(href) ? 'page' : undefined}
                    sx={{
                      color: path.startsWith(href) ? '#d6f0ae' : '#d1dedb',
                      bgcolor: path.startsWith(href) ? '#29443c' : 'transparent',
                      px: 2,
                    }}
                  >
                    {label}
                  </Button>
                ))}
                <Typography
                  variant="body2"
                  sx={{ color: '#a8bdb3', ml: { md: 2 }, px: { xs: 2, md: 0 } }}
                >
                  {session.user.username}
                </Typography>
                <Button onClick={logout} sx={{ color: '#d1dedb' }}>
                  Log out
                </Button>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
      <Container component="main" id="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, flex: 1 }}>
        {isLogin || session.status === 'authenticated' ? children : <Loading />}
      </Container>
      <Container component="footer" maxWidth="xl" sx={{ py: 3, borderTop: '1px solid #dce3df' }}>
        <Typography variant="caption" color="text.secondary">
          FLEET / Keep your vehicles moving.
        </Typography>
      </Container>
    </>
  );
}
