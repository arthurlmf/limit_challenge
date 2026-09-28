'use client';
import { Alert, Button } from '@mui/material';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Alert severity="error" action={<Button onClick={reset}>Try again</Button>}>
      This page could not load. Please try again.
    </Alert>
  );
}
