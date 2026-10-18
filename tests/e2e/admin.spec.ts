import { expect, test, type Page } from '@playwright/test';

/**
 * Admin portal journeys, including the access-control checks that matter most:
 * an unauthenticated visitor must get nothing, and the UI must never be the
 * only thing standing between a caller and the data.
 *
 * Credentials come from the environment and are provisioned by scripts/ci.sh.
 */

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'e2e-staff@example.test';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? 'e2e-staff-password-123';

async function signIn(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(STAFF_EMAIL);
  await page.getByLabel('Password').fill(STAFF_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

test.describe('unauthenticated access', () => {
  const protectedPaths = [
    '/admin',
    '/admin/submissions',
    '/admin/startup-applications',
    '/admin/submissions/11111111-1111-4111-8111-111111111111',
    '/admin/startup-applications/11111111-1111-4111-8111-111111111111',
  ];

  for (const path of protectedPaths) {
    test(`redirects ${path} to sign-in`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(
        page.getByRole('heading', { level: 1, name: 'Sign in' }),
      ).toBeVisible();
    });
  }

  test('leaks no submission data in the redirect response', async ({ page }) => {
    await page.goto('/admin/submissions');
    const body = (await page.textContent('body')) ?? '';

    expect(body).not.toContain('@example.test');
    expect(body.toLowerCase()).not.toContain('internal notes');
  });

  test('the presentation download route refuses an unauthenticated caller', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/presentations?token=anything');
    expect(response.status()).toBe(401);
  });

  test('admin pages are excluded from indexing', async ({ page }) => {
    await page.goto('/admin/login');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('sign-in', () => {
  test('rejects wrong credentials with a non-specific message', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill(STAFF_EMAIL);
    await page.getByLabel('Password').fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Those credentials were not recognised.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('gives the same message for an unknown account', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('nobody-at-all@example.test');
    await page.getByLabel('Password').fill('some-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Identical wording, so the response cannot be used to enumerate accounts.
    await expect(page.getByText('Those credentials were not recognised.')).toBeVisible();
  });

  test('signs in and reaches the dashboard', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(STAFF_EMAIL)).toBeVisible();
  });

  test('sets an httpOnly session cookie', async ({ page, context }) => {
    await signIn(page);

    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name.includes('bsp_session'));

    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe('Lax');
  });

  test('the session cookie is unreadable from JavaScript', async ({ page }) => {
    await signIn(page);
    const visible = await page.evaluate(() => document.cookie);
    expect(visible).not.toContain('bsp_session');
  });

  test('returns the user to where they were heading', async ({ page }) => {
    await page.goto('/admin/submissions');
    await expect(page).toHaveURL(/next=%2Fadmin%2Fsubmissions/);

    await page.getByLabel('Email address').fill(STAFF_EMAIL);
    await page.getByLabel('Password').fill(STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin\/submissions$/);
  });

  test('ignores an off-site redirect target', async ({ page }) => {
    await page.goto('/admin/login?next=https://evil.example.com/steal');

    await page.getByLabel('Email address').fill(STAFF_EMAIL);
    await page.getByLabel('Password').fill(STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe('signed-in staff', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('lists inquiries and opens one', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Admin' })
      .getByRole('link', { name: 'Inquiries' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Inquiries' }),
    ).toBeVisible();

    const reference = page.getByRole('link', { name: 'DIG-2610-SEEDDD' });
    await expect(reference).toBeVisible();
    await reference.click();

    await expect(page.getByText('DIG-2610-SEEDDD').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Submitted details' })).toBeVisible();
  });

  test('filters by status', async ({ page }) => {
    await page.goto('/admin/submissions');

    await page.getByLabel('Status').selectOption('RECEIVED');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/status=RECEIVED/);

    const badges = page.locator('tbody').getByText('Received', { exact: true });
    const rowCount = await page.locator('tbody tr').count();
    if (rowCount > 0 && !(await page.getByText('No inquiries match').isVisible())) {
      await expect(badges.first()).toBeVisible();
    }
  });

  test('filters by service', async ({ page }) => {
    await page.goto('/admin/submissions');

    await page.getByLabel('Service').selectOption('TRAINING');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/type=TRAINING/);
  });

  test('searching for nonsense returns an empty state, not an error', async ({
    page,
  }) => {
    await page.goto('/admin/submissions?q=zzzzz-no-such-record-zzzzz');
    await expect(page.getByText('No inquiries match these filters.')).toBeVisible();
  });

  test('updates a status and records it in the history', async ({ page }) => {
    // Opened by reference rather than "the first row": ordering depends on
    // whatever else the suite has created, and this record is reset to
    // RECEIVED by scripts/seed-test-data.ts on every run.
    await page.goto('/admin/submissions?q=GEN-2610-SEEDAA');
    await page.getByRole('link', { name: 'GEN-2610-SEEDAA' }).click();

    await expect(page.getByLabel('Status')).toHaveValue('RECEIVED');

    await page.getByLabel('Status').selectOption('UNDER_REVIEW');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Saved.')).toBeVisible();

    // The open page reflects the change without a manual reload.
    const history = page.getByRole('region', { name: 'History' });
    await expect(history.getByText('Status changed')).toBeVisible();
    await expect(history.getByText(/RECEIVED to UNDER_REVIEW/)).toBeVisible();
    await expect(page.getByLabel('Status')).toHaveValue('UNDER_REVIEW');
  });

  test('saves internal notes', async ({ page }) => {
    await page.goto('/admin/submissions?q=TRN-2610-SEEDBB');
    await page.getByRole('link', { name: 'TRN-2610-SEEDBB' }).click();

    const note = `Reviewed in E2E run at ${Date.now()}`;
    await page.getByLabel('Internal notes').fill(note);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Saved.')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Internal notes')).toHaveValue(note);
  });

  test('a malformed record id renders 404, not a server error', async ({ page }) => {
    const response = await page.goto('/admin/submissions/not-a-uuid');
    expect(response?.status()).toBe(404);
  });

  test('an unknown record id renders 404', async ({ page }) => {
    const response = await page.goto(
      '/admin/submissions/99999999-9999-4999-8999-999999999999',
    );
    expect(response?.status()).toBe(404);
  });

  test('issues an expiring download link for a presentation', async ({ page }) => {
    await page.goto('/admin/startup-applications');

    const reference = page.getByRole('link', { name: 'STU-2610-SEEDEE' });
    await expect(reference).toBeVisible();
    await reference.click();
    await expect(page.getByRole('heading', { name: 'Presentation' })).toBeVisible();

    // No URL is present until it is explicitly requested.
    await expect(page.getByRole('link', { name: /^Download/ })).toBeHidden();

    await page.getByRole('button', { name: 'Get download link' }).click();

    const downloadLink = page.getByRole('link', { name: /^Download/ });
    await expect(downloadLink).toBeVisible();
    await expect(page.getByText(/this link expires in/i)).toBeVisible();

    const href = await downloadLink.getAttribute('href');
    expect(href).toContain('token=');
  });

  test('the download link actually returns the file', async ({ page }) => {
    await page.goto('/admin/startup-applications');
    await page.getByRole('link', { name: 'STU-2610-SEEDEE' }).click();
    await page.getByRole('button', { name: 'Get download link' }).click();

    const href = await page.getByRole('link', { name: /^Download/ }).getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-disposition']).toContain('attachment');
    // A PDF, as stored.
    expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('a tampered download token is refused', async ({ page }) => {
    await page.goto('/admin/startup-applications');
    await page.getByRole('link', { name: 'STU-2610-SEEDEE' }).click();
    await page.getByRole('button', { name: 'Get download link' }).click();

    const href = await page.getByRole('link', { name: /^Download/ }).getAttribute('href');
    expect(href).toContain('token=');

    const tampered = href!.replace(
      /token=(.)/,
      (_match, first: string) => `token=${first === 'A' ? 'B' : 'A'}`,
    );

    const response = await page.request.get(tampered);
    expect(response.status()).toBe(403);
  });

  test('the download route rejects a request with no token', async ({ page }) => {
    const response = await page.request.get('/api/admin/presentations');
    expect(response.status()).toBe(400);
  });

  test('signs out and loses access again', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.goto('/admin/submissions');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('session invalidation', () => {
  test('a forged session cookie is rejected', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'bsp_session',
        value: 'forged-token.forged-signature',
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('a token with a valid shape but no record is rejected', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'bsp_session',
        value: 'a'.repeat(43).concat('.', 'b'.repeat(43)),
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
