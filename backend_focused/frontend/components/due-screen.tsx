'use client';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { fleetApi } from '@/lib/fleet-api';
import { useOffices, useUrlPage } from '@/lib/hooks';
import { Empty, Failure, Loading, PageHeading, Pager } from './common';
import VehicleTable from './vehicle-table';
export default function DueScreen() {
  const { page, setPage } = useUrlPage();
  const offices = useOffices();
  const query = useQuery({
    queryKey: ['fleet', 'due', page],
    queryFn: ({ signal }) => fleetApi.due(page, signal),
  });
  return (
    <>
      <PageHeading
        eyebrow="SERVICE PLANNING"
        title="Maintenance due"
        description="Prioritize active vehicles that have never been serviced or were last serviced more than 365 days ago."
        action={
          <Button component={Link} href="/vehicles" variant="outlined">
            View all vehicles
          </Button>
        }
      />
      <Alert severity="info" sx={{ mb: 3 }}>
        Never-serviced vehicles appear first, followed by the oldest service date. Record completed
        maintenance from the vehicle detail page.
      </Alert>
      {offices.isError && <Failure error={offices.error} retry={() => offices.refetch()} />}
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
            <Stack direction="row" justifyContent="space-between" p={3}>
              <Typography variant="h6">{query.data.count} vehicles need attention</Typography>
              <Typography color="text.secondary" variant="body2">
                {query.isFetching ? 'Updating…' : 'Oldest service first'}
              </Typography>
            </Stack>
            {query.data.results.length ? (
              <VehicleTable vehicles={query.data.results} offices={offices.data ?? []} due />
            ) : (
              <Empty
                title="Your fleet is up to date"
                description="No active vehicles currently meet the maintenance-due criteria."
              />
            )}
            <Pager count={query.data.count} page={page} onChange={setPage} />
          </>
        )}
      </Paper>
    </>
  );
}
