'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { fleetApi } from '@/lib/fleet-api';
import type { Maintenance } from '@/lib/types';
import { useUrlPage } from '@/lib/hooks';
import {
  dateLabel,
  DeleteDialog,
  Empty,
  Failure,
  Loading,
  PageHeading,
  Pager,
  Status,
} from './common';
import { AssignmentForm, MaintenanceForm, VehicleForm } from './forms';
export default function VehicleDetailScreen({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['fleet', 'vehicle', id],
    queryFn: ({ signal }) => fleetApi.detail(id, signal),
  });
  const { page: requestedPage, setPage } = useUrlPage();
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [maintenance, setMaintenance] = useState<Maintenance | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Maintenance | null>(null);
  const [notice, setNotice] = useState('');
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <>
        <Button component={Link} href="/vehicles">
          ← All vehicles
        </Button>
        <Failure error={query.error} retry={() => query.refetch()} />
      </>
    );
  const vehicle = query.data;
  const records = vehicle.maintenance_records;
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(records.length / 10)));
  return (
    <>
      <Button component={Link} href="/vehicles" sx={{ mb: 2 }}>
        ← All vehicles
      </Button>
      <PageHeading
        eyebrow={`VEHICLE / ${vehicle.license_plate}`}
        title={`${vehicle.make} ${vehicle.model}`}
        description={`${vehicle.year} · VIN ${vehicle.vin}`}
        action={
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={() => setEditing(true)}>
              Edit vehicle
            </Button>
            <Button variant="contained" onClick={() => setMaintenance('new')}>
              + Record maintenance
            </Button>
          </Stack>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Paper sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Current office
          </Typography>
          <Typography variant="h6">{vehicle.office.name}</Typography>
          <Typography color="text.secondary">{vehicle.office.city}</Typography>
          <Button onClick={() => setAssigning(true)} sx={{ mt: 1 }}>
            Move to another office →
          </Button>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Fleet status
          </Typography>
          <Box mt={1}>
            <Status active={vehicle.active} />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={2}>
            {vehicle.active
              ? 'In the active fleet'
              : 'Retired from active service; history preserved'}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Last maintenance
          </Typography>
          <Typography variant="h6">{dateLabel(records[0]?.maintenance_date ?? null)}</Typography>
          <Chip label={`${records.length} service records`} size="small" sx={{ mt: 2 }} />
        </Paper>
      </Box>
      <Paper>
        <Stack direction="row" justifyContent="space-between" p={3}>
          <Typography variant="h6">Maintenance history</Typography>
          <Typography variant="body2" color="text.secondary">
            {query.isFetching ? 'Updating…' : 'Newest first'}
          </Typography>
        </Stack>
        {records.length ? (
          <TableContainer>
            <Table aria-label="Maintenance history" sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date / type</TableCell>
                  <TableCell>Mechanic</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.slice((page - 1) * 10, page * 10).map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{record.maintenance_type}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {dateLabel(record.maintenance_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.mechanic.name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {record.mechanic.certification_number}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {record.cost}
                    </TableCell>
                    <TableCell
                      sx={{ maxWidth: 250, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                    >
                      {record.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" justifyContent="flex-end">
                        <Button onClick={() => setMaintenance(record)}>Edit</Button>
                        <Button color="error" onClick={() => setDeleting(record)}>
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Empty
            title="No maintenance recorded"
            description="Record completed work to build this vehicle’s service history."
            action={<Button onClick={() => setMaintenance('new')}>Record first maintenance</Button>}
          />
        )}
        <Pager count={records.length} page={page} onChange={setPage} />
      </Paper>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        Costs are shown in the company currency. Dates use the recorded calendar day.
      </Typography>
      {editing && (
        <VehicleForm
          vehicle={vehicle}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setNotice('Vehicle saved.');
          }}
        />
      )}
      {assigning && (
        <AssignmentForm
          vehicle={vehicle}
          onClose={() => setAssigning(false)}
          onSaved={() => {
            setAssigning(false);
            setNotice('Vehicle moved.');
          }}
        />
      )}
      {maintenance && (
        <MaintenanceForm
          vehicle={vehicle}
          record={maintenance === 'new' ? undefined : maintenance}
          onClose={() => setMaintenance(null)}
          onSaved={() => {
            setMaintenance(null);
            setPage(1);
            setNotice('Maintenance saved.');
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          resource="maintenance-records"
          id={deleting.id}
          label={deleting.maintenance_type}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setPage(1);
            setNotice('Maintenance deleted.');
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
