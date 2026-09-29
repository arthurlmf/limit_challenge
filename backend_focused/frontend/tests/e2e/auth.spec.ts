import { DEMO_USER, expect, test } from './fixtures';

test.describe('signed out', () => {
  test.use({ loggedIn: false });

  test('redirects to login and back to the requested page', async ({ page }) => {
    await page.goto('/offices?page=1');
    await expect(page).toHaveURL(/\/login\?next=%2Foffices%3Fpage%3D1$/);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);

    await page.getByLabel('Username').fill(DEMO_USER.username);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Incorrect username or password.')).toBeVisible();

    await page.getByLabel('Password').fill(DEMO_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/offices\?page=1$/);
    await expect(page.getByRole('heading', { name: 'Offices' })).toBeVisible();
    await expect(page.getByText(DEMO_USER.username, { exact: true })).toBeVisible();
  });

  test('logging out ends the session, including after a reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(DEMO_USER.username);
    await page.getByLabel('Password').fill(DEMO_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/vehicles$/);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/vehicles');
    await expect(page).toHaveURL(/\/login\?next=%2Fvehicles$/);
  });

  test('an invalid stored session sends the user to login', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('fleet.refreshToken', 'revoked'));
    await page.goto('/mechanics');
    await expect(page).toHaveURL(/\/login\?next=%2Fmechanics$/);
  });
});

test('an expired access token is refreshed without interrupting the user', async ({ page }) => {
  let rejected = false;
  await page.route('**/api/offices/summary/', async (route) => {
    if (rejected) return route.continue();
    rejected = true;
    await route.fulfill({ status: 401, json: { detail: 'Token is expired' } });
  });
  const refreshed = page.waitForRequest('**/api/auth/token/refresh/');

  await page.goto('/offices');
  await expect(page.getByRole('table', { name: 'Offices' })).toBeVisible();
  await refreshed;
  expect(rejected).toBe(true);
});
