import { expect, test, type Page } from '@playwright/test';

/**
 * Form journeys: validation feedback, successful submission, and the failure
 * modes a visitor must be able to understand.
 */

/**
 * Each form sits in its own landmark region. Scoping lookups to that region
 * avoids matching the region itself — its accessible name comes from the form
 * heading, which contains words that also appear in field labels.
 */
const contactForm = (page: Page) =>
  page.getByRole('region', { name: 'Send us a message' });

const startupForm = (page: Page) =>
  page.getByRole('region', { name: 'Submit your idea' });

test.describe('contact form', () => {
  test('submits successfully and shows a reference code', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await contactForm(page)
      .getByLabel('Message')
      .fill('I would like to know more about your training programmes and timings.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page).toHaveURL(/\/thank-you\?/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /message has been sent/i,
    );
    await expect(page.getByText(/^GEN-\d{4}-[A-Z2-9]{6}$/)).toBeVisible();
  });

  test('reports an invalid email inline without submitting', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('not-an-email');
    await contactForm(page)
      .getByLabel('Message')
      .fill('A message long enough to pass validation.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByLabel('Email address')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('will not submit without consent', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await contactForm(page)
      .getByLabel('Message')
      .fill('A message long enough to pass validation.');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('You must agree before submitting')).toBeVisible();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('shows a loading state while submitting', async ({ page }) => {
    await page.route('**/api/submissions', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });

    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await contactForm(page)
      .getByLabel('Message')
      .fill('A message long enough to pass validation.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  test('explains a server failure without claiming success', async ({ page }) => {
    await page.route('**/api/submissions', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'boom' }) }),
    );

    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await contactForm(page)
      .getByLabel('Message')
      .fill('A message long enough to pass validation.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(/not submitted/i)).toBeVisible();
    await expect(page.getByText(/were not saved/i)).toBeVisible();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('explains a rate-limited response', async ({ page }) => {
    await page.route('**/api/submissions', (route) =>
      route.fulfill({
        status: 429,
        headers: { 'retry-after': '600' },
        body: JSON.stringify({ error: 'rate limited' }),
      }),
    );

    await page.goto('/contact');
    await page.getByLabel('Full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await contactForm(page)
      .getByLabel('Message')
      .fill('A message long enough to pass validation.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText(/too many submissions/i)).toBeVisible();
  });
});

test.describe('training inquiry', () => {
  test('submits with a selected option', async ({ page }) => {
    await page.goto('/services/training-placement#enquire');

    await page.getByLabel('Full name').fill('Ravi Shah');
    await page.getByLabel('Email address').fill('ravi@example.test');
    await page
      .getByLabel('Which option are you interested in?')
      .selectOption('GENERAL_TRAINING_WITH_SUPPORT');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send training inquiry' }).click();

    await expect(page).toHaveURL(/\/thank-you\?/);
    await expect(page.getByText(/^TRN-\d{4}-[A-Z2-9]{6}$/)).toBeVisible();
  });

  test('requires an option to be chosen', async ({ page }) => {
    await page.goto('/services/training-placement#enquire');

    await page.getByLabel('Full name').fill('Ravi Shah');
    await page.getByLabel('Email address').fill('ravi@example.test');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send training inquiry' }).click();
    await expect(page.getByText('Choose a training option')).toBeVisible();
  });
});

test.describe('digitalization inquiry', () => {
  test('submits with a business name and option', async ({ page }) => {
    await page.goto('/services/digitalization#enquire');

    await page.getByLabel('Contact name').fill('Meera Patel');
    await page.getByLabel('Business name').fill('Patel Handlooms');
    await page.getByLabel('Email address').fill('meera@example.test');
    await page.getByLabel('Which option do you need?').selectOption('ECOMMERCE_LISTING');
    await page.getByLabel('Approximate number of products').fill('120');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Send inquiry' }).click();

    await expect(page).toHaveURL(/\/thank-you\?/);
    await expect(page.getByText(/^DIG-\d{4}-[A-Z2-9]{6}$/)).toBeVisible();
  });
});

test.describe('marketing inquiry', () => {
  test('submits without choosing a plan', async ({ page }) => {
    await page.goto('/services/marketing#enquire');

    await page.getByLabel('Full name').fill('Sunil Rao');
    await page.getByLabel('Email address').fill('sunil@example.test');
    await page.getByLabel('What do you want to promote?').fill('A new local bakery.');
    await page.getByLabel(/i agree that the details/i).check();

    await page.getByRole('button', { name: 'Request consultation' }).click();

    await expect(page).toHaveURL(/\/thank-you\?/);
    await expect(page.getByText(/^MKT-\d{4}-[A-Z2-9]{6}$/)).toBeVisible();
  });

  test('never shows an unconfirmed price', async ({ page }) => {
    await page.goto('/services/marketing');

    const cards = page.getByRole('article');
    const count = await cards.count();

    if (count > 0) {
      // Seeded plans all have unconfirmed pricing.
      await expect(
        page.getByText(/price confirmed with you before work starts/i).first(),
      ).toBeVisible();
    }
  });
});

test.describe('startup application', () => {
  const PDF_CONTENT = Buffer.from(
    '%PDF-1.7\n%\xe2\xe3\xcf\xd3\nstub presentation',
    'latin1',
  );

  async function fillRequiredFields(page: Page) {
    await page.getByLabel('Your full name').fill('Asha Kumar');
    await page.getByLabel('Email address').fill('asha@example.test');
    await page.getByLabel('Startup or idea name').fill('Fieldnote');
    await page.getByLabel('Idea title').fill('Offline-first field data collection');
    await page
      .getByLabel('Idea summary')
      .fill(
        'A mobile tool for surveyors working without connectivity, which stores records locally and syncs them when a connection returns.',
      );
    await startupForm(page)
      .getByRole('textbox', { name: 'Pitch video link' })
      .fill('https://example.test/pitch-video');
  }

  test('submits with a valid PDF presentation', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    await startupForm(page).locator('input[type="file"]').setInputFiles({
      name: 'fieldnote-pitch.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT,
    });
    await page.getByLabel(/i agree that my application/i).check();

    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page).toHaveURL(/\/thank-you\?/);
    await expect(page.getByText(/^STU-\d{4}-[A-Z2-9]{6}$/)).toBeVisible();
  });

  test('rejects an unsupported file type', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    await startupForm(page)
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'notes.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not a presentation'),
      });

    await expect(page.getByText(/must be one of: \.pdf, \.pptx, \.ppt/i)).toBeVisible();
  });

  test('rejects a file renamed to look like a PDF', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    // Passes the extension check, fails the content-signature check server-side.
    await startupForm(page)
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'payload.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
      });
    await page.getByLabel(/i agree that my application/i).check();

    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(
      page.getByText(/does not look like a PDF or PowerPoint presentation/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/startup-support/);
  });

  test('rejects an unsafe pitch video URL', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    await startupForm(page)
      .getByRole('textbox', { name: 'Pitch video link' })
      .fill('javascript:alert(1)');
    await startupForm(page).locator('input[type="file"]').setInputFiles({
      name: 'fieldnote-pitch.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT,
    });
    await page.getByLabel(/i agree that my application/i).check();

    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByText(/links must start with http/i)).toBeVisible();
  });

  test('requires a presentation', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    await page.getByLabel(/i agree that my application/i).check();

    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText('Attach your presentation')).toBeVisible();
  });

  test('requires a summary long enough to review', async ({ page }) => {
    await page.goto('/services/startup-support#apply');

    await fillRequiredFields(page);
    await page.getByLabel('Idea summary').fill('An app.');
    await startupForm(page).locator('input[type="file"]').setInputFiles({
      name: 'fieldnote-pitch.pdf',
      mimeType: 'application/pdf',
      buffer: PDF_CONTENT,
    });
    await page.getByLabel(/i agree that my application/i).check();

    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByText(/at least 40 characters/i)).toBeVisible();
  });
});

test.describe('thank-you page', () => {
  test('ignores a malformed reference in the URL', async ({ page }) => {
    await page.goto('/thank-you?kind=contact&ref=%3Cscript%3Ealert(1)%3C/script%3E');

    await expect(page.getByText('Your reference', { exact: true })).toBeHidden();
    await expect(page.locator('body')).not.toContainText('<script>');
  });

  test('shows a generic confirmation for an unknown kind', async ({ page }) => {
    await page.goto('/thank-you?kind=unknown');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /submission has been received/i,
    );
  });
});
