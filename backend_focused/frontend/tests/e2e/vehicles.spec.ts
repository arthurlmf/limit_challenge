import { expect, test, uid, vin } from './fixtures';

test('creates a vehicle and shows server validation errors', async ({ page, api }) => {
  const office = await api.office();
  const plate = `NEW-${uid()}`;
  await page.goto('/vehicles');
  await page.getByRole('button', { name: '+ Add vehicle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('VIN').fill(`I${vin().slice(1)}`);
  await dialog.getByLabel('License plate').fill(plate);
  await dialog.getByLabel('Make').fill('Toyota');
  await dialog.getByLabel('Model').fill('Hilux');
  await dialog.getByLabel('Year').fill('2023');
  await dialog.getByRole('combobox', { name: 'Office' }).click();
  await page.getByRole('option', { name: new RegExp(String(office.name)) }).click();
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByText(/excluding I, O and Q/).first()).toBeVisible();

  await dialog.getByLabel('VIN').fill(vin());
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Vehicle saved.')).toBeVisible();
  await page.goto(`/vehicles?make=toyota`);
  await expect(page.getByRole('table', { name: 'Vehicles' })).toContainText(plate);
});

test('warns about duplicate VIN and plate before saving', async ({ page, api }) => {
  const office = await api.office();
  const existing = await api.vehicle(office.id);
  await page.goto('/vehicles');
  await page.getByRole('button', { name: '+ Add vehicle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('VIN').fill(String(existing.vin));
  await dialog.getByLabel('License plate').fill(String(existing.license_plate).toLowerCase());
  await dialog.getByLabel('Make').focus();
  await expect(
    dialog.getByText('Another vehicle is already registered with this VIN.'),
  ).toBeVisible();
  await expect(dialog.getByText('An active vehicle already uses this plate.')).toBeVisible();

  await dialog.getByLabel('Active vehicle').uncheck();
  await expect(dialog.getByText('An active vehicle already uses this plate.')).toBeHidden();
  await expect(
    dialog.getByText('Another vehicle is already registered with this VIN.'),
  ).toBeVisible();
});

test('search filters live in the URL and survive a reload', async ({ page, api }) => {
  const office = await api.office();
  const make = `Make${uid()}`;
  const match = await api.vehicle(office.id, { make, model: 'Sprinter' });
  await api.vehicle(office.id, { make, model: 'Transit' });

  await page.goto('/vehicles');
  await page.getByLabel('Make').fill(make.slice(0, -1).toLowerCase());
  await page.getByLabel('Model').fill('sprint');
  await page.getByRole('button', { name: 'Apply filters' }).click();

  await expect(page).toHaveURL(/make=.*&model=sprint/);
  const rows = page.getByRole('table', { name: 'Vehicles' }).getByRole('row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText(String(match.license_plate));

  await page.reload();
  await expect(page.getByLabel('Model')).toHaveValue('sprint');
  await expect(rows).toHaveCount(2);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page).toHaveURL(/\/vehicles$/);
  await expect(page.getByLabel('Model')).toHaveValue('');
});

test('shows an empty state when no vehicle matches', async ({ page }) => {
  await page.goto(`/vehicles?make=nothing-${uid()}`);
  await expect(page.getByText('No matching vehicles')).toBeVisible();
});

test('records maintenance and moves a vehicle between offices', async ({ page, api }) => {
  const office = await api.office();
  const destination = await api.office();
  const mechanic = await api.mechanic();
  const vehicle = await api.vehicle(office.id);

  await page.goto(`/vehicles/${vehicle.id}`);
  await expect(page.getByText('No maintenance recorded')).toBeVisible();

  await page.getByRole('button', { name: '+ Record maintenance' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: 'Mechanic' }).click();
  await page.getByRole('option', { name: new RegExp(String(mechanic.name)) }).click();
  await dialog.getByLabel('Maintenance type').fill('Brake service');
  await dialog.getByLabel('Cost').fill('310.50');
  await dialog.getByRole('button', { name: 'Save changes' }).click();

  const history = page.getByRole('table', { name: 'Maintenance history' });
  await expect(history).toContainText('Brake service');
  await expect(history).toContainText(String(mechanic.name));
  await expect(page.getByText('1 service records')).toBeVisible();

  await page.getByRole('button', { name: 'Move to another office →' }).click();
  await page.getByRole('combobox', { name: 'Destination office' }).click();
  await page.getByRole('option', { name: new RegExp(String(destination.name)) }).click();
  await page.getByRole('button', { name: 'Move vehicle' }).click();
  await expect(page.getByText('Vehicle moved.')).toBeVisible();
  await expect(page.getByText(String(destination.name))).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('vehicle list does not overflow the viewport', async ({ page }) => {
    await page.goto('/vehicles');
    await expect(page.getByRole('table', { name: 'Vehicles' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
