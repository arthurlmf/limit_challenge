'use client';
import { useState } from 'react';
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
} from '@mui/material';
import { fleetApi } from '@/lib/fleet-api';
import { useUrlPage } from '@/lib/hooks';
import type { Mechanic } from '@/lib/types';
import { DeleteDialog, Empty, Failure, Loading, PageHeading, Pager, Status } from './common';
import { MechanicForm } from './forms';
export default function MechanicsScreen() {
  const { page, setPage } = useUrlPage();
  const query = useQuery({
    queryKey: ['fleet', 'mechanics', page],
    queryFn: ({ signal }) => fleetApi.mechanics(page, signal),
  });
  const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Mechanic | null>(null);
  const [notice, setNotice] = useState('');
  return (
    <>
      <PageHeading
        title="Mechanics"
        description="The people keeping your fleet in working order."
        action={
          <Button variant="contained" size="large" onClick={() => setEditing('new')}>
            + Add mechanic
          </Button>
        }
      />
      <Paper>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Box p={3}>
            <Failure error={query.error} retry={() => query.refetch()} />
            <Button onClick={() => setPage(1)}>Return to first page</Button>
          </Box>
        ) : (
          <>
            {query.data.results.length ? (
              <TableContainer>
                <Table aria-label="Mechanics" sx={{ minWidth: 550 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Certification</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.results.map((mechanic) => (
                      <TableRow key={mechanic.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{mechanic.name}</TableCell>
                        <TableCell>{mechanic.certification_number}</TableCell>
                        <TableCell>
                          <Status active={mechanic.active} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" justifyContent="flex-end">
                            <Button onClick={() => setEditing(mechanic)}>Edit</Button>
                            <Button color="error" onClick={() => setDeleting(mechanic)}>
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
                title="No mechanics yet"
                description="Add a mechanic to start recording maintenance."
              />
            )}
            <Pager count={query.data.count} page={page} onChange={setPage} />
          </>
        )}
      </Paper>
      {editing && (
        <MechanicForm
          mechanic={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('Mechanic saved.');
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          resource="mechanics"
          id={deleting.id}
          label={deleting.name}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setPage(1);
            setNotice('Mechanic deleted.');
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
