import { expect, test } from '@playwright/test';

/**
 * Responsive layout and keyboard accessibility.
 *
 * These run in the mobile project as well as desktop, so the mobile navigation
 * is exercised at a real narrow viewport rather than a resized desktop one.
 */

test.describe('mobile navigation', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 1024, 'desktop viewport');

  test('opens, navigates and closes', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Open menu' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    const panel = page.getByRole('dialog', { name: 'Site menu' });
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await panel.getByRole('link', { name: 'Startup Support' }).click();

    await expect(page).toHaveURL(/\/services\/startup-support$/);
    // The panel must not persist across a route change.
    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeHidden();
  });

  test('closes with the Escape key and returns focus to the trigger', async ({
    page,
  }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Open menu' });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('traps focus inside the open panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();

    const panel = page.getByRole('dialog', { name: 'Site menu' });
    await expect(panel).toBeVisible();

    // Tab through more elements than the panel contains; focus must stay inside.
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
    }

    const focusIsInsidePanel = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });

    expect(focusIsInsidePanel).toBe(true);
  });

  test('closes when the backdrop is tapped', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();

    // The scrim spans the viewport beneath the open panel, so most of it is
    // not hit-testable while the panel is up. Dispatching the event on the
    // scrim verifies that tapping it closes the menu, without fighting
    // pointer hit-testing for a point that a real finger could reach.
    await page.getByTestId('mobile-nav-backdrop').dispatchEvent('click');

    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeHidden();
  });
});

test.describe('layout integrity', () => {
  const paths = [
    '/',
    '/services',
    '/services/training-placement',
    '/services/startup-support',
    '/services/marketing',
    '/services/digitalization',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
  ];

  for (const path of paths) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      // A couple of pixels of rounding is tolerable; a scrollbar is not.
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});

test.describe('keyboard accessibility', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 1024, 'mobile viewport');

  test('the skip link is the first stop and moves focus to main', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('the contact form is completable by keyboard alone', async ({ page }) => {
    await page.goto('/contact');

    await page.getByLabel('Full name').focus();
    await page.keyboard.type('Keyboard User');
    await page.keyboard.press('Tab');
    await page.keyboard.type('keyboard@example.test');

    await page
      .getByRole('region', { name: 'Send us a message' })
      .getByLabel('Message')
      .focus();
    await page.keyboard.type('Submitted entirely with the keyboard to verify tab order.');

    await page.getByLabel(/i agree that the details/i).focus();
    await page.keyboard.press('Space');

    await page.getByRole('button', { name: 'Send message' }).focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/thank-you\?/);
  });

  test('every form control has an accessible name', async ({ page }) => {
    for (const path of ['/contact', '/services/startup-support', '/services/marketing']) {
      await page.goto(path);

      const unnamed = await page.evaluate(() => {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>('input, select, textarea'),
        ).filter((element) => {
          if (element.getAttribute('type') === 'hidden') return false;
          // The honeypot is intentionally hidden from assistive technology.
          if (element.closest('[aria-hidden="true"]')) return false;
          return true;
        });

        return controls
          .filter((element) => {
            const id = element.getAttribute('id');
            const hasLabel = id
              ? Boolean(document.querySelector(`label[for="${id}"]`))
              : false;
            return !hasLabel && !element.getAttribute('aria-label');
          })
          .map((element) => element.outerHTML.slice(0, 120));
      });

      expect(unnamed, `unnamed controls on ${path}`).toEqual([]);
    }
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /explore our services/i }).focus();

    const outlineWidth = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return '0px';
      return getComputedStyle(element).outlineWidth;
    });

    expect(Number.parseFloat(outlineWidth)).toBeGreaterThan(0);
  });
});
