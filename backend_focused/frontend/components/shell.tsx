'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';
const links = [
  ['/vehicles', 'Vehicles'],
  ['/maintenance-due', 'Maintenance due'],
  ['/offices', 'Offices'],
  ['/mechanics', 'Mechanics'],
];
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
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
            <Box
              component="nav"
              aria-label="Main navigation"
              sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: { md: 'auto' } }}
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
            </Box>
          </Stack>
        </Container>
      </Box>
      <Container component="main" id="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, flex: 1 }}>
        {children}
      </Container>
      <Container component="footer" maxWidth="xl" sx={{ py: 3, borderTop: '1px solid #dce3df' }}>
        <Typography variant="caption" color="text.secondary">
          FLEET / Keep your vehicles moving.
        </Typography>
      </Container>
    </>
  );
}
