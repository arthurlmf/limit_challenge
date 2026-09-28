import type { DueVehicle, Page } from '@/lib/types';
import { expect, test, today, uid } from './fixtures';

test('mechanic workload counts work recorded this year', async ({ page, api }) => {
  const office = await api.office();
  const vehicle = await api.vehicle(office.id);
  const mechanic = await api.mechanic(`Mechanic ${uid()}`);
  await api.maintenance(vehicle.id, mechanic.id);
  await api.maintenance(vehicle.id, mechanic.id);

  await page.goto('/mechanics');
  const row = page
    .getByRole('table', { name: 'Mechanic workload' })
    .getByRole('row')
    .filter({ hasText: String(mechanic.name) });
  await expect(row.getByRole('cell').nth(1)).toHaveText('2');
  await expect(row.getByRole('cell').nth(2)).toHaveText('240.00');
});

test('overdue vehicles leave the due list once serviced', async ({ page, api }) => {
  const office = await api.office();
  const mechanic = await api.mechanic();
  const vehicle = await api.vehicle(office.id);
  const overdue = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  await api.maintenance(vehicle.id, mechanic.id, overdue);

  const due: DueVehicle[] = [];
  for (let n = 1; ; n++) {
    const result = await api.get<Page<DueVehicle>>(`vehicles/needing-maintenance/?page=${n}`);
    due.push(...result.results);
    if (!result.next) break;
  }
  const pageNumber = Math.floor(due.findIndex((row) => row.id === vehicle.id) / 10) + 1;
  expect(pageNumber).toBeGreaterThan(0);

  await page.goto(`/maintenance-due?page=${pageNumber}`);
  const row = page.getByRole('row').filter({ hasText: String(vehicle.license_plate) });
  await row.getByRole('link', { name: 'Review & service' }).click();
  await expect(page).toHaveURL(new RegExp(`/vehicles/${vehicle.id}$`));

  await api.maintenance(vehicle.id, mechanic.id, today());
  await page.goto(`/maintenance-due?page=${pageNumber}`);
  await expect(page.getByText(/vehicles need attention/)).toBeVisible();
  await expect(
    page.getByRole('row').filter({ hasText: String(vehicle.license_plate) }),
  ).toHaveCount(0);
});

test('recovers when the API is unreachable', async ({ page }) => {
  await page.route('**/api/vehicles/**', (route) => route.abort());
  await page.goto('/vehicles');
  await expect(page.getByText(/Cannot reach the fleet API/)).toBeVisible({ timeout: 15_000 });

  await page.unroute('**/api/vehicles/**');
  await page.getByRole('button', { name: 'Retry' }).first().click();
  await expect(page.getByRole('table', { name: 'Vehicles' })).toBeVisible();
});
