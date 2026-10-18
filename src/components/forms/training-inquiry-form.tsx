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
  TRAINING_OPTION_LABELS,
  TRAINING_OPTIONS,
  trainingInquirySchema,
  type TrainingInquiryInput,
} from '@/lib/validation/submission-schema';

const trainingOptions = TRAINING_OPTIONS.map((option) => ({
  value: option,
  label: TRAINING_OPTION_LABELS[option],
}));

export function TrainingInquiryForm() {
  const { state, submit, isSubmitting } = useInquirySubmit({
    endpoint: '/api/submissions',
    thankYouKind: 'training',
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TrainingInquiryInput>({
    resolver: zodResolver(trainingInquirySchema),
    defaultValues: {
      submissionType: 'TRAINING',
      sourcePage: '/services/training-placement',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const outcome = await submit(values);
    if (!outcome.ok && outcome.fieldErrors) {
      for (const [field, message] of Object.entries(outcome.fieldErrors)) {
        setError(field as keyof TrainingInquiryInput, { type: 'server', message });
      }
    }
  });

  return (
    <FormShell
      id="enquire"
      title="Enquire about training"
      description="Tell us which option interests you and what you want to work towards. We will reply with the current programme details."
      state={state}
      isSubmitting={isSubmitting}
      submitLabel="Send training inquiry"
      onSubmit={onSubmit}
    >
      <input type="hidden" {...register('submissionType')} value="TRAINING" />
      <input
        type="hidden"
        {...register('sourcePage')}
        value="/services/training-placement"
      />
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
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <SelectField
          label="Which option are you interested in?"
          placeholder="Choose an option"
          options={trainingOptions}
          required
          error={errors.selectedOption?.message}
          {...register('selectedOption')}
        />
      </div>

      <TextField
        label="Area of interest"
        hint="For example: backend development, data engineering, cloud, QA."
        error={errors.areaOfInterest?.message}
        {...register('areaOfInterest')}
      />

      <TextAreaField
        label="Anything else we should know?"
        rows={5}
        hint="Your current background, availability, or what you are aiming for."
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
