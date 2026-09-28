'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
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
import type { Office } from '@/lib/types';
import { dateLabel, DeleteDialog, Empty, Failure, Loading, money, PageHeading } from './common';
import { OfficeForm } from './forms';
export default function OfficesScreen() {
  const query = useQuery({
    queryKey: ['fleet', 'office-summary'],
    queryFn: ({ signal }) => fleetApi.officeSummary(signal),
  });
  const [editing, setEditing] = useState<Office | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Office | null>(null);
  const [notice, setNotice] = useState('');
  return (
    <>
      <PageHeading
        title="Offices"
        description="Where your fleet is based, how much of it is active and what it costs to maintain."
        action={
          <Button variant="contained" size="large" onClick={() => setEditing('new')}>
            + Add office
          </Button>
        }
      />
      <Paper>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Box p={3}>
            <Failure error={query.error} retry={() => query.refetch()} />
          </Box>
        ) : query.data.length ? (
          <>
            <Stack direction="row" justifyContent="space-between" px={3} py={2}>
              <Typography variant="h6">
                Office summary{' '}
                <Typography component="span" color="text.secondary">
                  / {query.data.length}
                </Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {query.isFetching ? 'Updating…' : 'Spending covers the last 12 months'}
              </Typography>
            </Stack>
            <TableContainer>
              <Table aria-label="Offices" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Office</TableCell>
                    <TableCell align="right">Active vehicles</TableCell>
                    <TableCell align="right">Maintenance, last 12 months</TableCell>
                    <TableCell>Last maintenance</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {query.data.map((office) => (
                    <TableRow key={office.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{office.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {office.city}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Link href={`/vehicles?office=${office.id}&active=true`}>
                          {office.active_vehicle_count}
                        </Link>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {money(office.maintenance_cost_last_year)}
                      </TableCell>
                      <TableCell>
                        {office.last_maintenance ? dateLabel(office.last_maintenance) : '—'}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" justifyContent="flex-end">
                          <Button onClick={() => setEditing(office)}>Edit</Button>
                          <Button color="error" onClick={() => setDeleting(office)}>
                            Delete
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Empty
            title="No offices yet"
            description="Create an office to start organizing your vehicles."
          />
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        Spending includes inactive vehicles and is attributed to each vehicle&apos;s current office.
      </Typography>
      {editing && (
        <OfficeForm
          office={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('Office saved.');
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          resource="offices"
          id={deleting.id}
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setNotice('Office deleted.');
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
