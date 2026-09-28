'use client';
import { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Pagination,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import { errorMessage, fieldError, fleetApi } from '@/lib/fleet-api';
import { useFleetMutation } from '@/lib/hooks';

export function PageHeading({
  eyebrow = 'FLEET OPERATIONS',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      gap={2}
      mb={4}
    >
      <Box>
        <Typography variant="overline" color="primary">
          {eyebrow}
        </Typography>
        <Typography variant="h3" component="h1">
          {title}
        </Typography>
        <Typography color="text.secondary" mt={1}>
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}
export function Loading() {
  return (
    <Box role="status" aria-label="Loading records" py={4}>
      <LinearProgress />
      <Typography color="text.secondary" mt={2}>
        Loading fleet records…
      </Typography>
    </Box>
  );
}
export function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" onClick={retry}>
          Retry
        </Button>
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Box textAlign="center" py={7} px={3}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" my={1}>
        {description}
      </Typography>
      {action}
    </Box>
  );
}
export function Status({ active }: { active: boolean }) {
  return (
    <Chip
      size="small"
      label={active ? 'Active' : 'Inactive'}
      color={active ? 'success' : 'default'}
      variant="outlined"
    />
  );
}
export function Pager({
  count,
  page,
  onChange,
}: {
  count: number;
  page: number;
  onChange: (page: number) => void;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems="center"
      justifyContent="space-between"
      gap={2}
      p={2}
    >
      <Typography variant="body2" color="text.secondary">
        {count === 0
          ? '0 records'
          : `${(page - 1) * 10 + 1}–${Math.min(page * 10, count)} of ${count} records`}
      </Typography>
      <Pagination
        count={Math.max(1, Math.ceil(count / 10))}
        page={page}
        onChange={(_, value) => onChange(value)}
        color="primary"
      />
    </Stack>
  );
}
export function Field({
  name,
  errorSource,
  ...props
}: TextFieldProps & { name: string; errorSource?: unknown }) {
  const message = fieldError(errorSource, name);
  return (
    <TextField
      fullWidth
      margin="dense"
      name={name}
      error={Boolean(message)}
      {...props}
      helperText={message ?? props.helperText}
    />
  );
}
export function FormDialog({
  title,
  busy,
  error,
  onClose,
  onSubmit,
  children,
  submitLabel = 'Save changes',
  submitDisabled = false,
}: {
  title: string;
  busy: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  children: ReactNode;
  submitLabel?: string;
  submitDisabled?: boolean;
}) {
  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="form-title"
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <DialogTitle id="form-title">{title}</DialogTitle>
        <DialogContent>
          <Stack gap={1} pt={1}>
            {error ? <Alert severity="error">{errorMessage(error)}</Alert> : null}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy || submitDisabled}>
            {busy ? 'Saving…' : submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
export function DeleteDialog({
  resource,
  id,
  label,
  onClose,
  onDeleted,
}: {
  resource: Parameters<typeof fleetApi.remove>[0];
  id: number;
  label: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const mutation = useFleetMutation(() => fleetApi.remove(resource, id), onDeleted);
  return (
    <Dialog
      open
      onClose={mutation.isPending ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="delete-title"
    >
      <DialogTitle id="delete-title">Delete {label}?</DialogTitle>
      <DialogContent>
        <Typography>This cannot be undone. Related records may prevent deletion.</Typography>
        {resource === 'vehicles' || resource === 'mechanics' ? (
          <Typography mt={1} color="text.secondary">
            You can edit the record and mark it inactive to preserve its history.
          </Typography>
        ) : null}
        {mutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage(mutation.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Deleting…' : 'Delete record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export function dateLabel(value: string | null) {
  if (!value) return 'Never serviced';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
export const text = (data: FormData, name: string) => String(data.get(name) ?? '').trim();
const moneyFormat = new Intl.NumberFormat('en', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const money = (value: string) => moneyFormat.format(Number(value));
