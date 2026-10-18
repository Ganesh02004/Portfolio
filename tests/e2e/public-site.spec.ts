import { expect, test } from '@playwright/test';

/**
 * Public site journeys: navigation, structure and the honesty guarantees that
 * must hold on every page.
 */

const SERVICE_PAGES = [
  { href: '/services/training-placement', heading: 'IT Training & Placement Support' },
  { href: '/services/startup-support', heading: 'Startup Support' },
  { href: '/services/marketing', heading: 'Marketing Support' },
  { href: '/services/digitalization', heading: 'Business Digitalization & E-commerce' },
];

test.describe('homepage', () => {
  test('loads with one h1 and the four service cards', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    const serviceList = page.getByRole('region', { name: /what we do/i });
    for (const service of SERVICE_PAGES) {
      await expect(
        serviceList.getByRole('link', { name: service.heading }),
      ).toBeVisible();
    }
  });

  test('every service card navigates to its page', async ({ page }) => {
    for (const service of SERVICE_PAGES) {
      await page.goto('/');
      await page
        .getByRole('region', { name: /what we do/i })
        .getByRole('link', { name: service.heading })
        .click();

      await expect(page).toHaveURL(new RegExp(`${service.href}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: service.heading }),
      ).toBeVisible();
    }
  });

  test('shows the preview notice while content is unconfirmed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/preview build/i)).toBeVisible();
  });

  test('FAQ entries expand and collapse', async ({ page }) => {
    await page.goto('/');

    // Scoped to the FAQ region: the footer carries a similar disclaimer, and
    // an unscoped locator would match both.
    const faq = page.getByRole('region', { name: /common questions/i });
    const question = faq.getByText('Do you guarantee a job after training?');
    const answer = faq.getByText(/we provide training, interview preparation/i);

    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
    await question.click();
    await expect(answer).toBeHidden();
  });
});

test.describe('site-wide guarantees', () => {
  test('no page makes an employment or funding guarantee', async ({ page }) => {
    const pages = [
      '/',
      '/services',
      '/about',
      '/terms',
      ...SERVICE_PAGES.map((s) => s.href),
    ];

    for (const path of pages) {
      await page.goto(path);
      const body = (await page.textContent('body'))?.toLowerCase() ?? '';

      expect(body).not.toContain('guaranteed job');
      expect(body).not.toContain('guaranteed placement');
      expect(body).not.toContain('100% placement');
      expect(body).not.toContain('assured funding');
    }
  });

  test('sets the expected security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('footer legal links work from any page', async ({ page }) => {
    await page.goto('/services');

    await page
      .getByRole('navigation', { name: 'Footer' })
      .getByRole('link', { name: 'Privacy policy' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Privacy policy' }),
    ).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Footer' })
      .getByRole('link', { name: 'Terms of service' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Terms of service' }),
    ).toBeVisible();
  });
});

test.describe('error pages', () => {
  test('an unknown path renders a usable 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: /could not find that page/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /go to the homepage/i })).toBeVisible();
  });
});

test.describe('health', () => {
  test('reports both dependencies as healthy', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.checks).toEqual({ database: true });
  });

  test('does not leak configuration', async ({ request }) => {
    const body = await (await request.get('/api/health')).text();

    expect(body).not.toMatch(/postgres:\/\//);
    expect(body).not.toMatch(/secret/i);
    expect(body).not.toMatch(/password/i);
  });
});
