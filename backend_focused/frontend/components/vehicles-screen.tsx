'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { fleetApi } from '@/lib/fleet-api';
import { useOffices, useUrlPage } from '@/lib/hooks';
import type { Vehicle } from '@/lib/types';
import { DeleteDialog, Empty, Failure, Loading, PageHeading, Pager } from './common';
import { VehicleForm } from './forms';
import VehicleTable from './vehicle-table';

const fields = [
  'office',
  'active',
  'make',
  'model',
  'maintenance_date_from',
  'maintenance_date_to',
  'mechanic_certification_number',
];
export default function VehiclesScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { page, setPage } = useUrlPage();
  const filters: Record<string, string> = { page: String(page) };
  for (const key of fields) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  const query = useQuery({
    queryKey: ['fleet', 'vehicles', filters],
    queryFn: ({ signal }) => fleetApi.vehicles(filters, signal),
  });
  const offices = useOffices();
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [notice, setNotice] = useState('');
  const filtered = fields.some((field) => params.has(field));
  return (
    <>
      <PageHeading
        title="Your fleet"
        description="Every vehicle, office and service record. All in one place."
        action={
          <Button variant="contained" size="large" onClick={() => setEditing('new')}>
            + Add vehicle
          </Button>
        }
      />
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Find a vehicle</Typography>
          <Typography variant="caption" color="text.secondary" alignSelf="center">
            COMBINE FILTERS
          </Typography>
        </Stack>
        <Box
          component="form"
          key={params.toString()}
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const next = new URLSearchParams();
            for (const key of fields) {
              const value = String(values.get(key) ?? '').trim();
              if (value) next.set(key, value);
            }
            router.push(`/vehicles?${next}`, { scroll: false });
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              select
              name="office"
              label="Office"
              defaultValue={params.get('office') ?? ''}
              size="small"
            >
              <MenuItem value="">All offices</MenuItem>
              {params.get('office') &&
                !offices.data?.some((o) => String(o.id) === params.get('office')) && (
                  <MenuItem value={params.get('office')!}>Office #{params.get('office')}</MenuItem>
                )}
              {offices.data?.map((o) => (
                <MenuItem key={o.id} value={String(o.id)}>
                  {o.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              name="active"
              label="Status"
              defaultValue={params.get('active') ?? ''}
              size="small"
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </TextField>
            <TextField
              name="make"
              label="Make"
              defaultValue={params.get('make') ?? ''}
              size="small"
              placeholder="e.g. Ford"
            />
            <TextField
              name="model"
              label="Model"
              defaultValue={params.get('model') ?? ''}
              size="small"
              placeholder="e.g. Transit"
            />
            <TextField
              name="maintenance_date_from"
              label="Serviced from"
              type="date"
              defaultValue={params.get('maintenance_date_from') ?? ''}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="maintenance_date_to"
              label="Serviced through"
              type="date"
              defaultValue={params.get('maintenance_date_to') ?? ''}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="mechanic_certification_number"
              label="Mechanic certification"
              defaultValue={params.get('mechanic_certification_number') ?? ''}
              size="small"
            />
            <Stack direction="row" gap={1}>
              <Button type="submit" variant="contained">
                Apply filters
              </Button>
              <Button onClick={() => router.push('/vehicles')}>Clear</Button>
            </Stack>
          </Box>
          <Typography variant="caption" display="block" color="text.secondary" mt={2}>
            Make and model use exact matches. Date and mechanic filters apply to the same service
            record.
          </Typography>
        </Box>
      </Paper>
      {offices.isError && <Failure error={offices.error} retry={() => offices.refetch()} />}
      <Paper>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Box p={3}>
            <Failure error={query.error} retry={() => query.refetch()} />
            <Button sx={{ mt: 1 }} onClick={() => router.push('/vehicles')}>
              Reset filters and page
            </Button>
          </Box>
        ) : (
          <>
            <Stack direction="row" justifyContent="space-between" px={3} py={2}>
              <Typography variant="h6">
                Vehicles{' '}
                <Typography component="span" color="text.secondary">
                  / {query.data.count}
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {query.isFetching ? 'Updating…' : filtered ? 'Filtered results' : 'All vehicles'}
              </Typography>
            </Stack>
            {query.data.results.length ? (
              <VehicleTable
                vehicles={query.data.results}
                offices={offices.data ?? []}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ) : (
              <Empty
                title={filtered ? 'No matching vehicles' : 'Your fleet starts here'}
                description={
                  filtered
                    ? 'Try a different office, status or service date.'
                    : 'Add an office, then register your first vehicle.'
                }
              />
            )}
            <Pager count={query.data.count} page={page} onChange={setPage} />
          </>
        )}
      </Paper>
      {editing && (
        <VehicleForm
          vehicle={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('Vehicle saved.');
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          resource="vehicles"
          id={deleting.id}
          label={deleting.license_plate}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setPage(1);
            setNotice('Vehicle deleted.');
          }}
        />
      )}
      <Snackbar open={!!notice} autoHideDuration={4000} onClose={() => setNotice('')}>
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
