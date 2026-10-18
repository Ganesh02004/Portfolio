'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormShell } from '@/components/forms/form-shell';
import { useInquirySubmit } from '@/components/forms/use-inquiry-submit';
import {
  CheckboxField,
  HoneypotField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/field';
import {
  marketingInquirySchema,
  type MarketingInquiryInput,
} from '@/lib/validation/submission-schema';

export interface MarketingInquiryFormProps {
  /** Active plans, so the visitor can name the one they are asking about. */
  planOptions: ReadonlyArray<{ value: string; label: string }>;
}

export function MarketingInquiryForm({ planOptions }: MarketingInquiryFormProps) {
  const { state, submit, isSubmitting } = useInquirySubmit({
    endpoint: '/api/submissions',
    thankYouKind: 'marketing',
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MarketingInquiryInput>({
    resolver: zodResolver(marketingInquirySchema),
    defaultValues: {
      submissionType: 'MARKETING',
      sourcePage: '/services/marketing',
      selectedOption: 'UNDECIDED',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const outcome = await submit(values);
    if (!outcome.ok && outcome.fieldErrors) {
      for (const [field, message] of Object.entries(outcome.fieldErrors)) {
        setError(field as keyof MarketingInquiryInput, { type: 'server', message });
      }
    }
  });

  const options = [
    { value: 'UNDECIDED', label: 'Not sure yet — recommend something' },
    ...planOptions,
  ];

  return (
    <FormShell
      id="enquire"
      title="Request a marketing consultation"
      description="Tell us about your business and what you are trying to promote. We will come back with a scope and a price before any work starts."
      state={state}
      isSubmitting={isSubmitting}
      submitLabel="Request consultation"
      onSubmit={onSubmit}
    >
      <input type="hidden" {...register('submissionType')} value="MARKETING" />
      <input type="hidden" {...register('sourcePage')} value="/services/marketing" />
      <HoneypotField {...register('website')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Business name"
          autoComplete="organization"
          error={errors.businessName?.message}
          {...register('businessName')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
      </div>

      <SelectField
        label="Which engagement are you asking about?"
        options={options}
        hint="Plans are still being finalised, so choosing is optional."
        error={errors.selectedOption?.message}
        {...register('selectedOption')}
      />

      <TextAreaField
        label="What do you want to promote?"
        rows={5}
        hint="Your product or service, who you are trying to reach, and anything you have tried already."
        error={errors.message?.message}
        {...register('message')}
      />

      <CheckboxField
        label="I agree that the details I have provided may be stored and used to respond to this inquiry."
        required
        error={errors.consent?.message}
        {...register('consent')}
      />
    </FormShell>
  );
}
