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

export const DEMO_USER = { username: 'demo', password: 'demo-password' };

async function obtainTokens(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/auth/token/`, { data: DEMO_USER });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as { access: string; refresh: string };
}

class Api {
  constructor(
    private request: APIRequestContext,
    private access: string,
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.access}` };
  }

  async post(resource: string, data: object): Promise<Created> {
    const response = await this.request.post(`${API_URL}/${resource}/`, {
      data,
      headers: this.headers,
    });
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.request.get(`${API_URL}/${path}`, { headers: this.headers });
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

export const test = base.extend<{ api: Api; loggedIn: boolean }>({
  loggedIn: [true, { option: true }],
  api: async ({ request }, use) => use(new Api(request, (await obtainTokens(request)).access)),
  page: async ({ page, request, loggedIn }, use) => {
    if (loggedIn) {
      // A fresh refresh token per test: rotation revokes a token after one use.
      const { refresh } = await obtainTokens(request);
      await page.addInitScript((token) => {
        if (!localStorage.getItem('fleet.refreshToken')) {
          localStorage.setItem('fleet.refreshToken', token);
        }
      }, refresh);
    }
    await use(page);
  },
});
export { expect };
