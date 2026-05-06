import { test, expect } from '@playwright/test';

test('uygulama açılıyor ve giriş ekranı görünüyor', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Okçuluk Turnuva')).toBeVisible();
  await expect(page.getByText(/Google ile devam et/)).toBeVisible();
});

test('izleyici sayfası giriş gerektirmeden açılır', async ({ page }) => {
  const res = await page.goto('/spectate');
  expect(res?.ok() ?? true).toBeTruthy();
});
