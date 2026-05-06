# Task 27 — Test (Unit + E2E)

## Amaç
Unit test, integration test ve E2E test ile uygulamanın kritik fonksiyonlarının kararlılığını sağlamak.

## Test Stratejisi

| Tip | Araç | Kapsam |
|---|---|---|
| Unit | Vitest + Testing Library | Utility, hooks, components |
| Integration | Vitest | API client, store |
| E2E | Playwright | Kritik kullanıcı akışları |

## Unit Test Örnekleri

### Skor Hesaplama

`src/lib/archery/scoring.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { calculateTotal, sortParticipants, getScoreOptions } from './scoring';

describe('calculateTotal', () => {
  it('toplam puanı doğru hesaplar', () => {
    const arrows = [{value:10}, {value:9}, {value:8}];
    expect(calculateTotal(arrows)).toBe(27);
  });

  it('iska 0 sayılır', () => {
    expect(calculateTotal([{value:0}, {value:10}])).toBe(10);
  });
});

describe('sortParticipants — tie-break', () => {
  it('toplam puana göre sıralar', () => {
    const a = { total: 100, x_count: 0, ten_count: 0, nine_count: 0 };
    const b = { total: 90, x_count: 5, ten_count: 5, nine_count: 5 };
    expect(sortParticipants([b, a])).toEqual([a, b]);
  });

  it('eşitlikte X sayısına bakar', () => {
    const a = { total: 100, x_count: 3, ten_count: 5, nine_count: 0 };
    const b = { total: 100, x_count: 5, ten_count: 3, nine_count: 0 };
    expect(sortParticipants([a, b])).toEqual([b, a]);
  });

  it('X eşitse 10 sayısına bakar', () => {
    const a = { total: 100, x_count: 5, ten_count: 3, nine_count: 0 };
    const b = { total: 100, x_count: 5, ten_count: 5, nine_count: 0 };
    expect(sortParticipants([a, b])).toEqual([b, a]);
  });
});

describe('getScoreOptions', () => {
  it('WA hedefler için 0–10 + X döndürür', () => {
    const opts = getScoreOptions('wa_122');
    expect(opts.find(o => o.label === 'X')?.isX).toBe(true);
    expect(opts.find(o => o.label === '10' && !o.isX)).toBeDefined();
    expect(opts.find(o => o.label === 'M')?.value).toBe(0);
  });

  it('3D hedef için X=11', () => {
    const opts = getScoreOptions('three_d');
    expect(opts.find(o => o.label === 'X')?.value).toBe(11);
  });

  it('Puta için sadece vurdu/vurmadı', () => {
    const opts = getScoreOptions('puta');
    expect(opts).toHaveLength(2);
  });
});
```

### Ring Detection (Görsel Mod)

```ts
describe('detectRing', () => {
  it('merkez tıklamada X verir', () => {
    expect(detectRing(0, 0, 'wa_122').label).toBe('X');
  });
  it('uzak tıklamada M verir', () => {
    expect(detectRing(1.5, 0, 'wa_122').label).toBe('M');
  });
});
```

### Yaş Grubu Eşleme

```ts
describe('ageToGroup', () => {
  it.each([
    [10, 'U11'], [13, 'U13'], [14, 'U15'], [17, 'U18'], [20, 'U21'], [25, 'seniors']
  ])('%i → %s', (age, group) => expect(ageToGroup(age)).toBe(group));
});
```

## Integration Test

### Auth Store

```ts
import { useAuth } from './authStore';

it('init session yokken loading=false yapar', async () => {
  await useAuth.getState().init();
  expect(useAuth.getState().loading).toBe(false);
});
```

## E2E (Playwright)

`tests/e2e/admin-flow.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test.describe('Yönetici akışı', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'admin@test.com');
    await page.fill('[name=password]', 'admin123');
    await page.click('button:has-text("Giriş")');
    await expect(page).toHaveURL('/admin');
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

  test('Yönetici katılım talebini onaylayabilir', async ({ page, browser }) => {
    // Test setup: önceden bir turnuva ve pending bir talep olmalı
    await page.goto('/admin/tournaments/<test-id>/approvals');
    await page.click('button:has-text("Onayla")').first();
    await expect(page.locator('text=Yarışmacı onaylandı')).toBeVisible();
  });
});

test('Yarışmacı set commit edebilir', async ({ page }) => {
  // login as competitor, joined approved tournament
  await page.goto('/tournament/<id>/score');
  for (let i = 0; i < 6; i++) {
    await page.click('button[aria-label="10"]');
  }
  await page.click('button:has-text("Kaydet")');
  await page.click('button:has-text("Onayla")');
  await expect(page.locator('text=Set 2')).toBeVisible();
});

test('Bittikten sonra puan girişi engellenir', async ({ page }) => {
  // tournament status = completed
  await page.goto('/tournament/<id>/score');
  await expect(page.locator('text=Turnuva tamamlandı')).toBeVisible();
  await expect(page.locator('button[aria-label="10"]')).toBeDisabled();
});
```

## Coverage Hedefleri

- `src/lib/archery/` → %95+ (kritik iş kuralları)
- Components → %60+
- Hooks → %75+

## CI Çalışması

`.github/workflows/test.yml`:
```yaml
name: tests
on: [pull_request, push]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
```

E2E ayrı job — Supabase local container Docker ile çalışır, opsiyonel olarak nightly çalışır (CI dakikası tasarruf).

## Test Veri Hazırlama

E2E için `tests/fixtures/seed-test-db.sql` — her run öncesi DB'yi reset eder.

## Kabul Kriterleri

- [x] `npm test` tüm unit test'leri çalıştırıyor
- [x] Coverage raporu üretiliyor
- [x] Sıralama (tie-break) tüm edge case'leri test ediliyor
- [x] Hedef tipi → puan eşleme test ediliyor
- [x] Playwright kritik akışları test ediyor
- [x] CI'da unit testler her PR'da çalışıyor

## Bağımlılık
- Task 01, Task 13, Task 15
