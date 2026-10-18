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
  DIGITALIZATION_OPTION_LABELS,
  DIGITALIZATION_OPTIONS,
  digitalizationInquirySchema,
  type DigitalizationInquiryInput,
} from '@/lib/validation/submission-schema';

const optionChoices = DIGITALIZATION_OPTIONS.map((option) => ({
  value: option,
  label: DIGITALIZATION_OPTION_LABELS[option],
}));

export function DigitalizationInquiryForm() {
  const { state, submit, isSubmitting } = useInquirySubmit({
    endpoint: '/api/submissions',
    thankYouKind: 'digitalization',
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DigitalizationInquiryInput>({
    resolver: zodResolver(digitalizationInquirySchema),
    defaultValues: {
      submissionType: 'DIGITALIZATION',
      sourcePage: '/services/digitalization',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const outcome = await submit(values);
    if (!outcome.ok && outcome.fieldErrors) {
      for (const [field, message] of Object.entries(outcome.fieldErrors)) {
        setError(field as keyof DigitalizationInquiryInput, { type: 'server', message });
      }
    }
  });

  return (
    <FormShell
      id="enquire"
      title="Discuss your business"
      description="Tell us what you sell and where you want it available. We will explain what the process involves for your category."
      state={state}
      isSubmitting={isSubmitting}
      submitLabel="Send inquiry"
      onSubmit={onSubmit}
    >
      <input type="hidden" {...register('submissionType')} value="DIGITALIZATION" />
      <input type="hidden" {...register('sourcePage')} value="/services/digitalization" />
      <HoneypotField {...register('website')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Contact name"
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="Business name"
          autoComplete="organization"
          required
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
        label="Which option do you need?"
        placeholder="Choose an option"
        options={optionChoices}
        required
        error={errors.selectedOption?.message}
        {...register('selectedOption')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Product or service category"
          hint="For example: groceries, apparel, handmade goods, services."
          error={errors.productCategory?.message}
          {...register('productCategory')}
        />
        <TextField
          label="Approximate number of products"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          error={errors.approximateProductCount?.message}
          {...register('approximateProductCount')}
        />
      </div>

      <TextField
        label="Current online presence"
        hint="A website, social page or existing marketplace listing, if you have one."
        error={errors.currentPresence?.message}
        {...register('currentPresence')}
      />

      <TextAreaField
        label="What do you need help with?"
        rows={5}
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
