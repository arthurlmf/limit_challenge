import axios from 'axios';
import { apiClient } from './api-client';
import type {
  Office,
  Mechanic,
  Vehicle,
  VehicleDetail,
  DueVehicle,
  Page,
  OfficeInput,
  MechanicInput,
  VehicleInput,
  MaintenanceInput,
} from './types';

async function list<T>(
  resource: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal,
) {
  return (await apiClient.get<Page<T>>(`${resource}/`, { params, signal })).data;
}
// Reference datasets are small. Traverse all pages so form choices never silently omit records.
async function references<T>(resource: string, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await list<T>(resource, { page }, signal);
    items.push(...result.results);
    if (!result.next) return items;
  }
}
async function save<T>(resource: string, data: T, id?: number) {
  if (id) await apiClient.patch(`${resource}/${id}/`, data);
  else await apiClient.post(`${resource}/`, data);
}
export const fleetApi = {
  vehicles: (params: Record<string, string>, signal?: AbortSignal) =>
    list<Vehicle>('vehicles', params, signal),
  due: (page: number, signal?: AbortSignal) =>
    list<DueVehicle>('vehicles/needing-maintenance', { page }, signal),
  detail: async (id: string, signal?: AbortSignal) =>
    (await apiClient.get<VehicleDetail>(`vehicles/${id}/`, { signal })).data,
  offices: (page: number, signal?: AbortSignal) => list<Office>('offices', { page }, signal),
  mechanics: (page: number, signal?: AbortSignal) => list<Mechanic>('mechanics', { page }, signal),
  officeOptions: (signal?: AbortSignal) => references<Office>('offices', signal),
  mechanicOptions: (signal?: AbortSignal) => references<Mechanic>('mechanics', signal),
  saveOffice: (data: OfficeInput, id?: number) => save('offices', data, id),
  saveMechanic: (data: MechanicInput, id?: number) => save('mechanics', data, id),
  saveVehicle: (data: VehicleInput, id?: number) => save('vehicles', data, id),
  saveMaintenance: (data: MaintenanceInput, id?: number) => save('maintenance-records', data, id),
  remove: async (
    resource: 'vehicles' | 'offices' | 'mechanics' | 'maintenance-records',
    id: number,
  ) => {
    await apiClient.delete(`${resource}/${id}/`);
  },
  assign: async (id: number, office: number) => {
    await apiClient.post(`vehicles/${id}/assign-office/`, { office });
  },
};
export function fieldError(error: unknown, field: string): string | undefined {
  if (!axios.isAxiosError(error)) return;
  const value = error.response?.data?.[field];
  return Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : undefined;
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return 'Cannot reach the fleet API. Check your connection and that the backend is running, then retry.';
    if (error.response.status === 404) return 'This record or page is no longer available.';
    if (error.response.status >= 500)
      return 'The fleet API could not complete this request. Please try again.';
    const fields = error.response.data;
    const messages =
      fields && typeof fields === 'object'
        ? Object.keys(fields)
            .map((key) => fieldError(error, key))
            .filter(Boolean)
            .join(' ')
        : '';
    return (
      fieldError(error, 'detail') ??
      fieldError(error, 'non_field_errors') ??
      (messages || 'Please review your input and try again.')
    );
  }
  return 'Something went wrong. Please try again.';
}
