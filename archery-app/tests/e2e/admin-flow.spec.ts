import { test, expect } from '@playwright/test';

// Bu akışlar gerçek Supabase verisi gerektirir; CI'da nightly olarak çalışır.
// Yerelde `npm run dev:netlify` ayağa kalkıp tohum verisi yüklendikten sonra koşturulabilir.
test.describe('Yönetici akışı', () => {
  test.skip(
    !process.env.E2E_WITH_DB,
    'E2E_WITH_DB ortam değişkeni ayarlanmadan atlanır',
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type=email]', 'admin@archery.test');
    await page.fill('input[type=password]', 'password123');
    await page.click('button:has-text("Giriş")');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('Yönetici turnuva oluşturup QR görüntüleyebilir', async ({ page }) => {
    await page.click('a:has-text("Yeni Turnuva")');
    await page.fill('[name=name]', 'Test Turnuvası');
    await page.fill('[name=date]', '2026-06-01');
    await page.selectOption('[name=bow_type]', 'recurve');
    await page.selectOption('[name=age_group]', 'seniors');
    await page.fill('[name=set_count]', '10');
    await page.selectOption('[name=arrows_per_set]', '6');
    await page.selectOption('[name=target_type]', 'wa_122');
    await page.fill('[name=distance_meters]', '70');
    await page.click('button:has-text("Kaydet")');

    await expect(page.locator('text=Yarışmacı QR')).toBeVisible();
    await expect(page.locator('text=İzleyici QR')).toBeVisible();
  });
});
