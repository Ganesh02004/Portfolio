import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CheckboxField, SelectField, TextField } from '@/components/ui/field';
import { StatusBadge } from '@/components/ui/status-badge';
import { MarketingPlanCard } from '@/components/services/marketing-plan-card';
import { ServiceCard } from '@/components/services/service-card';
import { services } from '@/config/services';
import type { MarketingPlan } from '@/types/domain';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Email address" name="email" type="email" />);
    const input = screen.getByLabelText(/email address/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('marks optional fields so the requirement is never ambiguous', () => {
    render(<TextField label="Phone" name="phone" />);
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('wires an error to the input via aria-describedby and announces it', () => {
    render(<TextField label="Email address" name="email" error="Enter a valid email" />);

    const input = screen.getByLabelText(/email address/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Enter a valid email');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('includes a hint in aria-describedby alongside the error', () => {
    render(
      <TextField
        label="Phone"
        name="phone"
        hint="Include your country code"
        error="Too short"
      />,
    );

    const describedBy = screen.getByLabelText(/phone/i).getAttribute('aria-describedby');
    expect(describedBy).toContain('field-phone-hint');
    expect(describedBy).toContain('field-phone-error');
  });

  it('accepts typed input', async () => {
    const user = userEvent.setup();
    render(<TextField label="Full name" name="fullName" />);

    const input = screen.getByLabelText(/full name/i);
    await user.type(input, 'Asha Kumar');
    expect(input).toHaveValue('Asha Kumar');
  });
});

describe('SelectField', () => {
  it('renders a disabled placeholder that cannot be submitted as a value', () => {
    render(
      <SelectField
        label="Training option"
        name="selectedOption"
        placeholder="Choose an option"
        required
        options={[
          { value: 'GENERAL_TRAINING', label: 'General Training' },
          { value: 'GENERAL_TRAINING_WITH_SUPPORT', label: 'General Training + Support' },
        ]}
      />,
    );

    const select = screen.getByLabelText(/training option/i);
    expect(select).toBeRequired();
    expect(screen.getByRole('option', { name: 'Choose an option' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'General Training' })).toBeEnabled();
  });
});

describe('CheckboxField', () => {
  it('is operable by keyboard', async () => {
    const user = userEvent.setup();
    render(<CheckboxField label="I agree to the terms" name="consent" required />);

    const checkbox = screen.getByLabelText(/i agree to the terms/i);
    expect(checkbox).not.toBeChecked();

    await user.tab();
    expect(checkbox).toHaveFocus();

    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
  });
});

describe('StatusBadge', () => {
  // Status must never be conveyed by colour alone.
  it.each([
    ['RECEIVED', 'Received'],
    ['UNDER_REVIEW', 'Under review'],
    ['SHORTLISTED', 'Shortlisted'],
    ['NOT_SELECTED', 'Not selected'],
    ['NEEDS_INFORMATION', 'Needs information'],
  ] as const)('renders %s as readable text "%s"', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe('ServiceCard', () => {
  const service = services[0];

  it('exposes exactly one link, named by the heading', () => {
    render(
      <ul>
        <ServiceCard service={service} />
      </ul>,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(service.title);
    expect(links[0]).toHaveAttribute('href', service.href);
  });

  it('lists the service highlights', () => {
    render(
      <ul>
        <ServiceCard service={service} />
      </ul>,
    );

    for (const highlight of service.highlights) {
      expect(screen.getByText(highlight)).toBeInTheDocument();
    }
  });
});

describe('MarketingPlanCard', () => {
  const basePlan: MarketingPlan = {
    id: 'plan-1',
    name: '6-month engagement',
    slug: 'six-month',
    billingModel: 'RECURRING',
    durationMonths: 6,
    priceMinorUnits: null,
    currency: 'INR',
    summary: 'A sustained engagement.',
    targetBusiness: null,
    ctaLabel: 'Request a consultation',
    deliverables: ['Monthly content plan'],
    exclusions: ['Paid ad budget'],
    isActive: true,
    isPricingConfirmed: false,
    displayOrder: 10,
  };

  // The important guarantee: an unconfirmed price is never published.
  it('hides the price when pricing is unconfirmed', () => {
    render(
      <ul>
        <MarketingPlanCard plan={{ ...basePlan, priceMinorUnits: 2_500_000 }} />
      </ul>,
    );

    expect(screen.getByText(/price confirmed with you/i)).toBeInTheDocument();
    expect(screen.queryByText(/25,000/)).not.toBeInTheDocument();
  });

  it('shows the price once pricing is confirmed', () => {
    render(
      <ul>
        <MarketingPlanCard
          plan={{ ...basePlan, priceMinorUnits: 2_500_000, isPricingConfirmed: true }}
        />
      </ul>,
    );

    expect(screen.getByText(/25,000/)).toBeInTheDocument();
    expect(screen.getByText('per month')).toBeInTheDocument();
  });

  it('describes a one-time plan without a monthly suffix', () => {
    render(
      <ul>
        <MarketingPlanCard
          plan={{
            ...basePlan,
            billingModel: 'ONE_TIME',
            durationMonths: null,
            priceMinorUnits: 5_000_000,
            isPricingConfirmed: true,
          }}
        />
      </ul>,
    );

    expect(screen.getByText('One-time engagement')).toBeInTheDocument();
    expect(screen.queryByText('per month')).not.toBeInTheDocument();
  });

  it('separates what is included from what is not', () => {
    render(
      <ul>
        <MarketingPlanCard plan={basePlan} />
      </ul>,
    );

    const article = screen.getByRole('article');
    expect(within(article).getByText('Monthly content plan')).toBeInTheDocument();
    expect(within(article).getByText('Paid ad budget')).toBeInTheDocument();
    expect(within(article).getByText('Not included')).toBeInTheDocument();
  });
});
