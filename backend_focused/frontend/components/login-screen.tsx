'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { errorMessage } from '@/lib/fleet-api';
import { safeNext, useAuth } from '@/lib/auth';

function loginError(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401)
    return 'Incorrect username or password.';
  return errorMessage(error);
}

export default function LoginScreen() {
  const router = useRouter();
  const { session, login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (session.status === 'authenticated') {
      router.replace(safeNext(new URLSearchParams(window.location.search).get('next')));
    }
  }, [session.status, router]);

  return (
    <Box display="flex" justifyContent="center" pt={{ xs: 2, md: 6 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="overline" color="primary">
          FLEET OPERATIONS
        </Typography>
        <Typography variant="h4" component="h1" fontWeight={700} mb={1}>
          Sign in
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Use your fleet account to manage vehicles and maintenance.
        </Typography>
        <Box
          component="form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setBusy(true);
            setError(null);
            try {
              await login(String(data.get('username')).trim(), String(data.get('password')));
            } catch (caught) {
              setError(caught);
              setBusy(false);
            }
          }}
        >
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError(error)}
            </Alert>
          ) : null}
          <TextField
            name="username"
            label="Username"
            autoComplete="username"
            required
            fullWidth
            margin="dense"
            autoFocus
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            fullWidth
            margin="dense"
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={busy}
            sx={{ mt: 2 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
