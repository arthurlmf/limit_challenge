'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, FormControlLabel, MenuItem, Switch, Typography } from '@mui/material';
import { fleetApi } from '@/lib/fleet-api';
import { useFleetMutation, useMechanics, useOffices } from '@/lib/hooks';
import type { Vehicle, VehicleDetail, Maintenance, Office, Mechanic } from '@/lib/types';
import { Failure, Field, FormDialog, Loading, text } from './common';

interface DialogProps {
  onClose: () => void;
  onSaved: () => void;
}
export function OfficeForm({ office, onClose, onSaved }: DialogProps & { office?: Office }) {
  const save = useFleetMutation(
    (data: FormData) =>
      fleetApi.saveOffice({ name: text(data, 'name'), city: text(data, 'city') }, office?.id),
    onSaved,
  );
  return (
    <FormDialog
      title={office ? 'Edit office' : 'Add office'}
      busy={save.isPending}
      error={save.error}
      onClose={onClose}
      onSubmit={save.mutate}
    >
      <Field
        name="name"
        label="Office name"
        required
        defaultValue={office?.name}
        errorSource={save.error}
        inputProps={{ maxLength: 120 }}
      />
      <Field
        name="city"
        label="City"
        required
        defaultValue={office?.city}
        errorSource={save.error}
        inputProps={{ maxLength: 120 }}
      />
    </FormDialog>
  );
}
export function MechanicForm({
  mechanic,
  onClose,
  onSaved,
}: DialogProps & { mechanic?: Mechanic }) {
  const save = useFleetMutation(
    (data: FormData) =>
      fleetApi.saveMechanic(
        {
          name: text(data, 'name'),
          certification_number: text(data, 'certification_number'),
          active: data.has('active'),
        },
        mechanic?.id,
      ),
    onSaved,
  );
  return (
    <FormDialog
      title={mechanic ? 'Edit mechanic' : 'Add mechanic'}
      busy={save.isPending}
      error={save.error}
      onClose={onClose}
      onSubmit={save.mutate}
    >
      <Field
        name="name"
        label="Mechanic name"
        required
        defaultValue={mechanic?.name}
        errorSource={save.error}
        inputProps={{ maxLength: 120 }}
      />
      <Field
        name="certification_number"
        label="Certification number"
        required
        defaultValue={mechanic?.certification_number}
        errorSource={save.error}
        inputProps={{ maxLength: 80 }}
      />
      <FormControlLabel
        control={<Switch name="active" defaultChecked={mechanic?.active ?? true} />}
        label="Active mechanic"
      />
    </FormDialog>
  );
}
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
function useDuplicateCheck(vehicle?: Vehicle | VehicleDetail) {
  const [probe, setProbe] = useState({
    vin: vehicle?.vin ?? '',
    license_plate: vehicle?.license_plate ?? '',
    active: vehicle?.active ?? true,
  });
  const params = { ...probe, exclude_id: vehicle?.id };
  const conflicts = useQuery({
    // Outside the 'fleet' prefix: refetching after a save would flag the saved vehicle itself.
    queryKey: ['duplicate-check', params],
    queryFn: ({ signal }) => fleetApi.duplicateCheck(params, signal),
    enabled: VIN_PATTERN.test(probe.vin) && probe.license_plate !== '',
  });
  const update = (field: 'vin' | 'license_plate', value: string) =>
    setProbe((current) => ({ ...current, [field]: value.trim().toUpperCase() }));
  return {
    update,
    setActive: (active: boolean) => setProbe((current) => ({ ...current, active })),
    has: (field: 'vin' | 'license_plate') =>
      Boolean(conflicts.isSuccess && conflicts.data.includes(field)),
  };
}
export function VehicleForm({
  vehicle,
  onClose,
  onSaved,
}: DialogProps & { vehicle?: Vehicle | VehicleDetail }) {
  const offices = useOffices();
  const duplicates = useDuplicateCheck(vehicle);
  const save = useFleetMutation(
    (data: FormData) =>
      fleetApi.saveVehicle(
        {
          vin: text(data, 'vin'),
          license_plate: text(data, 'license_plate'),
          make: text(data, 'make'),
          model: text(data, 'model'),
          year: Number(data.get('year')),
          office: Number(data.get('office')),
          active: data.has('active'),
        },
        vehicle?.id,
      ),
    onSaved,
  );
  const officeId = vehicle
    ? typeof vehicle.office === 'number'
      ? vehicle.office
      : vehicle.office.id
    : '';
  return (
    <FormDialog
      title={vehicle ? 'Edit vehicle' : 'Add vehicle'}
      busy={save.isPending}
      submitDisabled={offices.isPending || offices.isError || !offices.data?.length}
      error={save.error}
      onClose={onClose}
      onSubmit={save.mutate}
    >
      {offices.isPending ? (
        <Loading />
      ) : offices.isError ? (
        <Failure error={offices.error} retry={() => offices.refetch()} />
      ) : (
        <>
          {!offices.data.length && (
            <Alert severity="info">Create an office before adding a vehicle.</Alert>
          )}
          <Field
            name="vin"
            label="VIN"
            required
            defaultValue={vehicle?.vin}
            errorSource={save.error}
            onBlur={(event) => duplicates.update('vin', event.target.value)}
            {...(duplicates.has('vin')
              ? { error: true, helperText: 'Another vehicle is already registered with this VIN.' }
              : { helperText: '17 characters; letters I, O and Q are excluded.' })}
            inputProps={{ minLength: 17, maxLength: 17 }}
          />
          <Field
            name="license_plate"
            label="License plate"
            required
            defaultValue={vehicle?.license_plate}
            errorSource={save.error}
            onBlur={(event) => duplicates.update('license_plate', event.target.value)}
            {...(duplicates.has('license_plate')
              ? { error: true, helperText: 'An active vehicle already uses this plate.' }
              : {})}
            inputProps={{ maxLength: 20 }}
          />
          <Field
            name="make"
            label="Make"
            required
            defaultValue={vehicle?.make}
            errorSource={save.error}
            inputProps={{ maxLength: 80 }}
          />
          <Field
            name="model"
            label="Model"
            required
            defaultValue={vehicle?.model}
            errorSource={save.error}
            inputProps={{ maxLength: 80 }}
          />
          <Field
            name="year"
            label="Year"
            type="number"
            required
            defaultValue={vehicle?.year}
            errorSource={save.error}
            inputProps={{ min: 1886, max: new Date().getUTCFullYear() + 1 }}
          />
          <Field
            name="office"
            label="Office"
            select
            required
            defaultValue={officeId}
            errorSource={save.error}
          >
            {offices.data.map((office) => (
              <MenuItem key={office.id} value={office.id}>
                {office.name} · {office.city}
              </MenuItem>
            ))}
          </Field>
          <FormControlLabel
            control={
              <Switch
                name="active"
                defaultChecked={vehicle?.active ?? true}
                onChange={(event) => duplicates.setActive(event.target.checked)}
              />
            }
            label="Active vehicle"
          />
        </>
      )}
    </FormDialog>
  );
}
export function MaintenanceForm({
  vehicle,
  record,
  onClose,
  onSaved,
}: DialogProps & { vehicle: VehicleDetail; record?: Maintenance }) {
  const mechanics = useMechanics();
  const save = useFleetMutation(
    (data: FormData) =>
      fleetApi.saveMaintenance(
        {
          vehicle: vehicle.id,
          mechanic: Number(data.get('mechanic')),
          maintenance_date: text(data, 'maintenance_date'),
          maintenance_type: text(data, 'maintenance_type'),
          cost: text(data, 'cost'),
          notes: text(data, 'notes'),
        },
        record?.id,
      ),
    onSaved,
  );
  return (
    <FormDialog
      title={record ? 'Edit maintenance' : 'Record maintenance'}
      busy={save.isPending}
      submitDisabled={mechanics.isPending || mechanics.isError || !mechanics.data?.length}
      error={save.error}
      onClose={onClose}
      onSubmit={save.mutate}
    >
      <Typography color="text.secondary">
        {vehicle.make} {vehicle.model} · {vehicle.license_plate}
      </Typography>
      {mechanics.isPending ? (
        <Loading />
      ) : mechanics.isError ? (
        <Failure error={mechanics.error} retry={() => mechanics.refetch()} />
      ) : (
        <>
          {!mechanics.data.length && (
            <Alert severity="info">Create a mechanic before recording maintenance.</Alert>
          )}
          <Field
            name="mechanic"
            label="Mechanic"
            select
            required
            defaultValue={record?.mechanic.id ?? ''}
            errorSource={save.error}
          >
            {mechanics.data.map((mechanic) => (
              <MenuItem key={mechanic.id} value={mechanic.id}>
                {mechanic.name} · {mechanic.certification_number}
                {mechanic.active ? '' : ' (inactive)'}
              </MenuItem>
            ))}
          </Field>
          <Field
            name="maintenance_date"
            label="Maintenance date"
            type="date"
            required
            defaultValue={record?.maintenance_date ?? new Date().toISOString().slice(0, 10)}
            errorSource={save.error}
            slotProps={{ inputLabel: { shrink: true } }}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
          />
          <Field
            name="maintenance_type"
            label="Maintenance type"
            required
            defaultValue={record?.maintenance_type}
            errorSource={save.error}
            helperText="For example: inspection, oil change or brake service."
            inputProps={{ maxLength: 120 }}
          />
          <Field
            name="cost"
            label="Cost"
            type="number"
            required
            defaultValue={record?.cost}
            errorSource={save.error}
            helperText="Company currency · two decimal places"
            inputProps={{ min: 0, max: '9999999999.99', step: '0.01' }}
          />
          <Field
            name="notes"
            label="Notes"
            multiline
            minRows={3}
            defaultValue={record?.notes}
            errorSource={save.error}
          />
        </>
      )}
    </FormDialog>
  );
}
export function AssignmentForm({
  vehicle,
  onClose,
  onSaved,
}: DialogProps & { vehicle: VehicleDetail }) {
  const offices = useOffices();
  const save = useFleetMutation(
    (data: FormData) => fleetApi.assign(vehicle.id, Number(data.get('office'))),
    onSaved,
  );
  return (
    <FormDialog
      title="Move vehicle"
      busy={save.isPending}
      submitDisabled={offices.isPending || offices.isError}
      error={save.error}
      onClose={onClose}
      onSubmit={save.mutate}
      submitLabel="Move vehicle"
    >
      <Typography color="text.secondary">
        Current office: {vehicle.office.name}. Historical maintenance spending will be attributed to
        the new office.
      </Typography>
      {offices.isPending ? (
        <Loading />
      ) : offices.isError ? (
        <Failure error={offices.error} retry={() => offices.refetch()} />
      ) : (
        <Field
          name="office"
          label="Destination office"
          select
          required
          defaultValue={vehicle.office.id}
          errorSource={save.error}
        >
          {offices.data.map((office) => (
            <MenuItem key={office.id} value={office.id}>
              {office.name} · {office.city}
            </MenuItem>
          ))}
        </Field>
      )}
    </FormDialog>
  );
}
