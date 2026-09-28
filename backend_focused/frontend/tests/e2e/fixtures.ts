import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { API_URL } from '../servers';

const VIN_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

export const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
export const vin = () =>
  Array.from({ length: 17 }, () => VIN_ALPHABET[Math.floor(Math.random() * 33)]).join('');
export const today = () => new Date().toISOString().slice(0, 10);

interface Created {
  id: number;
  [key: string]: unknown;
}

class Api {
  constructor(private request: APIRequestContext) {}

  async post(resource: string, data: object): Promise<Created> {
    const response = await this.request.post(`${API_URL}/${resource}/`, { data });
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.request.get(`${API_URL}/${path}`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  office(name = `Office ${uid()}`) {
    return this.post('offices', { name, city: 'Denver' });
  }

  mechanic(name = `Mechanic ${uid()}`) {
    return this.post('mechanics', { name, certification_number: `E2E-${uid()}`, active: true });
  }

  vehicle(office: number, overrides: object = {}) {
    return this.post('vehicles', {
      vin: vin(),
      license_plate: `E2E-${uid()}`,
      make: 'Ford',
      model: 'Transit',
      year: 2022,
      office,
      active: true,
      ...overrides,
    });
  }

  maintenance(vehicle: number, mechanic: number, maintenance_date = today()) {
    return this.post('maintenance-records', {
      vehicle,
      mechanic,
      maintenance_date,
      maintenance_type: 'Inspection',
      cost: '120.00',
      notes: '',
    });
  }
}

export const test = base.extend<{ api: Api }>({
  api: async ({ request }, use) => use(new Api(request)),
});
export { expect };
