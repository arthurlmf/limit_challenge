'use client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { PropsWithChildren, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { AuthProvider } from '@/lib/auth';
const theme = createTheme({
  palette: {
    primary: { main: '#24594b' },
    background: { default: '#f5f6f2', paper: '#ffffff' },
    text: { primary: '#1d302a', secondary: '#65746c' },
    success: { main: '#387753' },
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    h3: { fontWeight: 700, fontSize: '2.25rem', letterSpacing: '-0.06em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: '0.13em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0, variant: 'outlined' } },
    MuiTableCell: {
      styleOverrides: {
        head: { backgroundColor: '#edf1eb', color: '#526459', fontWeight: 700 },
        root: { borderColor: '#edf0eb' },
      },
    },
  },
});
export default function Providers({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              count < 1 &&
              !(axios.isAxiosError(error) && error.response && error.response.status < 500),
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
