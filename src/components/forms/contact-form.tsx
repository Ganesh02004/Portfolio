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
import { services } from '@/config/services';
import { contactSchema, type ContactInput } from '@/lib/validation/submission-schema';

const subjectOptions = [
  { value: 'General question', label: 'General question' },
  ...services.map((service) => ({ value: service.name, label: service.name })),
  { value: 'Something else', label: 'Something else' },
];

export function ContactForm() {
  const { state, submit, isSubmitting } = useInquirySubmit({
    endpoint: '/api/submissions',
    thankYouKind: 'contact',
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { submissionType: 'CONTACT', sourcePage: '/contact' },
  });

  const onSubmit = handleSubmit(async (values) => {
    const outcome = await submit(values);
    if (!outcome.ok && outcome.fieldErrors) {
      for (const [field, message] of Object.entries(outcome.fieldErrors)) {
        setError(field as keyof ContactInput, { type: 'server', message });
      }
    }
  });

  return (
    <FormShell
      id="contact-form"
      title="Send us a message"
      description="Tell us what you need. We read every message and reply to the email address you give us."
      state={state}
      isSubmitting={isSubmitting}
      submitLabel="Send message"
      onSubmit={onSubmit}
    >
      <input type="hidden" {...register('submissionType')} value="CONTACT" />
      <input type="hidden" {...register('sourcePage')} value="/contact" />
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
          hint="Include your country code if you are outside India."
          error={errors.phone?.message}
          {...register('phone')}
        />
        <SelectField
          label="What is this about?"
          placeholder="Choose a topic"
          options={subjectOptions}
          error={errors.subject?.message}
          {...register('subject')}
        />
      </div>

      <TextAreaField
        label="Message"
        required
        rows={6}
        hint="The more context you give, the more useful our first reply will be."
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
