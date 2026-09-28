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
import type { Office } from '@/lib/types';
import { DeleteDialog, Empty, Failure, Loading, PageHeading, Pager } from './common';
import { OfficeForm } from './forms';
export default function OfficesScreen() {
  const { page, setPage } = useUrlPage();
  const query = useQuery({
    queryKey: ['fleet', 'offices', page],
    queryFn: ({ signal }) => fleetApi.offices(page, signal),
  });
  const [editing, setEditing] = useState<Office | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Office | null>(null);
  const [notice, setNotice] = useState('');
  return (
    <>
      <PageHeading
        title="Offices"
        description="The places your fleet calls home."
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
            <Button onClick={() => setPage(1)}>Return to first page</Button>
          </Box>
        ) : (
          <>
            {query.data.results.length ? (
              <TableContainer>
                <Table aria-label="Offices">
                  <TableHead>
                    <TableRow>
                      <TableCell>Office name</TableCell>
                      <TableCell>City</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.results.map((office) => (
                      <TableRow key={office.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{office.name}</TableCell>
                        <TableCell>{office.city}</TableCell>
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
            ) : (
              <Empty
                title="No offices yet"
                description="Create an office to start organizing your vehicles."
              />
            )}
            <Pager count={query.data.count} page={page} onChange={setPage} />
          </>
        )}
      </Paper>
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
            setPage(1);
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
