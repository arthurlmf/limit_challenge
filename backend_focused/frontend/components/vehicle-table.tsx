'use client';
import Link from 'next/link';
import {
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { Vehicle, Office, DueVehicle } from '@/lib/types';
import { dateLabel, Status } from './common';
export default function VehicleTable({
  vehicles,
  offices,
  due = false,
  onEdit,
  onDelete,
}: {
  vehicles: (Vehicle | DueVehicle)[];
  offices: Office[];
  due?: boolean;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}) {
  const officeNames = new Map(offices.map((office) => [office.id, office.name]));
  return (
    <TableContainer>
      <Table aria-label={due ? 'Vehicles needing maintenance' : 'Vehicles'} sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>License plate</TableCell>
            <TableCell>Office</TableCell>
            <TableCell>{due ? 'Last maintenance' : 'Status'}</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id} hover>
              <TableCell>
                <Link href={`/vehicles/${vehicle.id}`} style={{ fontWeight: 700 }}>
                  {vehicle.make} {vehicle.model}
                </Link>
                <Typography variant="caption" display="block" color="text.secondary">
                  {vehicle.year} · {vehicle.vin}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {vehicle.license_plate}
                </Typography>
              </TableCell>
              <TableCell>
                {officeNames.get(vehicle.office) ?? `Office #${vehicle.office}`}
              </TableCell>
              <TableCell>
                {due && 'last_maintenance' in vehicle ? (
                  <Chip
                    size="small"
                    label={dateLabel(vehicle.last_maintenance)}
                    color="warning"
                    variant="outlined"
                  />
                ) : (
                  <Status active={vehicle.active} />
                )}
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end" gap={0.5}>
                  <Button component={Link} href={`/vehicles/${vehicle.id}`}>
                    {due ? 'Review & service' : 'View'}
                  </Button>
                  {onEdit && <Button onClick={() => onEdit(vehicle)}>Edit</Button>}
                  {onDelete && (
                    <Button color="error" onClick={() => onDelete(vehicle)}>
                      Delete
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
