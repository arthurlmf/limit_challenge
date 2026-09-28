import { expect, test, uid } from './fixtures';

test('creates, summarizes, edits and deletes an office', async ({ page }) => {
  const name = `Office ${uid()}`;
  await page.goto('/offices');
  await page.getByRole('button', { name: '+ Add office' }).click();
  await page.getByLabel('Office name').fill(name);
  await page.getByLabel('City').fill('Boston');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toContainText('Boston');
  await expect(row.getByRole('cell').nth(1)).toHaveText('0');
  await expect(row.getByRole('cell').nth(2)).toHaveText('0.00');
  await expect(row.getByRole('cell').nth(3)).toHaveText('—');

  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('City').fill('Miami');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Miami');

  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete record' }).click();
  await expect(page.getByText('Office deleted.')).toBeVisible();
  await expect(row).toHaveCount(0);
});

test('summary reflects vehicles and spending, and links to filtered vehicles', async ({
  page,
  api,
}) => {
  const office = await api.office();
  const mechanic = await api.mechanic();
  const vehicle = await api.vehicle(office.id);
  await api.vehicle(office.id, { active: false });
  await api.maintenance(vehicle.id, mechanic.id);

  await page.goto('/offices');
  const row = page.getByRole('row').filter({ hasText: String(office.name) });
  await expect(row.getByRole('cell').nth(2)).toHaveText('120.00');
  await row.getByRole('link', { name: '1' }).click();
  await expect(page).toHaveURL(new RegExp(`office=${office.id}&active=true`));
  await expect(page.getByRole('table', { name: 'Vehicles' }).getByRole('row')).toHaveCount(2);
});

test('explains why an office with vehicles cannot be deleted', async ({ page, api }) => {
  const office = await api.office();
  await api.vehicle(office.id);
  await page.goto('/offices');
  const row = page.getByRole('row').filter({ hasText: String(office.name) });
  await row.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete record' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Cannot delete this resource while related records exist.',
  );
});
