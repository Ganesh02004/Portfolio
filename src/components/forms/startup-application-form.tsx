'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormShell } from '@/components/forms/form-shell';
import {
  CheckboxField,
  HoneypotField,
  TextAreaField,
  TextField,
} from '@/components/ui/field';
import { Callout } from '@/components/ui/callout';
import { formatFileSize } from '@/lib/utils';
import type { SubmitState } from '@/components/forms/use-inquiry-submit';
import {
  ACCEPTED_PRESENTATION_EXTENSIONS,
  maxPresentationBytes,
  presentationErrorMessage,
  startupApplicationFieldsSchema,
  validatePresentationMetadata,
  type StartupApplicationFields,
} from '@/lib/validation/startup-schema';

/**
 * Startup application form.
 *
 * The presentation is sent as multipart/form-data rather than JSON so the file
 * is streamed instead of base64-inflated. The file input sits outside
 * react-hook-form's value tracking — a File is not serialisable state — and is
 * validated separately against the same rules the server enforces.
 */
export function StartupApplicationForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  const [fileError, setFileError] = useState<string | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<StartupApplicationFields>({
    resolver: zodResolver(startupApplicationFieldsSchema),
  });

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file) {
      setFileError(undefined);
      return;
    }

    const problem = validatePresentationMetadata({
      filename: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
    });
    setFileError(problem ? presentationErrorMessage(problem) : undefined);
  }

  const onSubmit = handleSubmit(async (values) => {
    const file = fileInputRef.current?.files?.[0] ?? null;

    const problem = validatePresentationMetadata(
      file ? { filename: file.name, sizeBytes: file.size, mimeType: file.type } : null,
    );
    if (problem || !file) {
      const message = presentationErrorMessage(problem ?? { kind: 'MISSING' });
      setFileError(message);
      setState({ status: 'error', message: 'Please correct the highlighted fields.' });
      return;
    }

    setFileError(undefined);
    setState({ status: 'submitting' });

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null) continue;
      formData.append(key, typeof value === 'boolean' ? String(value) : String(value));
    }
    formData.append('presentation', file);

    let response: Response;
    try {
      response = await fetch('/api/startup-applications', {
        method: 'POST',
        body: formData,
      });
    } catch {
      setState({
        status: 'error',
        message:
          'We could not reach the server. Check your connection and try again — nothing was submitted.',
      });
      return;
    }

    if (response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const referenceCode =
        body && typeof body === 'object' && 'referenceCode' in body
          ? String((body as { referenceCode: unknown }).referenceCode)
          : '';
      const params = new URLSearchParams({ kind: 'startup' });
      if (referenceCode) params.set('ref', referenceCode);
      router.push(`/thank-you?${params.toString()}`);
      return;
    }

    if (response.status === 429) {
      setState({
        status: 'error',
        message:
          'Too many submissions from your connection. Please try again in a little while.',
      });
      return;
    }

    if (response.status === 413) {
      setFileError(
        `Presentation must be ${Math.floor(maxPresentationBytes() / (1024 * 1024))} MB or smaller`,
      );
      setState({
        status: 'error',
        message: 'Your presentation was too large to upload.',
      });
      return;
    }

    const body: unknown = await response.json().catch(() => null);
    if (response.status === 400 && body && typeof body === 'object') {
      const fieldErrors = (body as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field === 'presentation') {
            setFileError(message);
          } else {
            setError(field as keyof StartupApplicationFields, {
              type: 'server',
              message,
            });
          }
        }
        setState({
          status: 'error',
          message: 'Please correct the highlighted fields and submit again.',
        });
        return;
      }
    }

    setState({
      status: 'error',
      message:
        'Something went wrong on our side and your application was not saved. Please try again in a moment.',
    });
  });

  const isSubmitting = state.status === 'submitting';
  const maxSizeLabel = `${Math.floor(maxPresentationBytes() / (1024 * 1024))} MB`;

  return (
    <FormShell
      id="apply"
      title="Submit your idea"
      description="Share your idea with a presentation and a link to your pitch video. Every application is reviewed by our team."
      state={state}
      isSubmitting={isSubmitting}
      submitLabel="Submit application"
      onSubmit={onSubmit}
    >
      <HoneypotField {...register('website')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Your full name"
          autoComplete="name"
          required
          error={errors.applicantName?.message}
          {...register('applicantName')}
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
        <TextField
          label="Startup or idea name"
          required
          error={errors.startupName?.message}
          {...register('startupName')}
        />
      </div>

      <TextField
        label="Idea title"
        required
        hint="One line that captures what you are building."
        error={errors.ideaTitle?.message}
        {...register('ideaTitle')}
      />

      <TextAreaField
        label="Idea summary"
        required
        rows={6}
        hint="At least a few sentences: what it is, who it is for, and what stage you are at."
        error={errors.ideaSummary?.message}
        {...register('ideaSummary')}
      />

      <TextAreaField
        label="What problem does it solve?"
        rows={4}
        error={errors.problemStatement?.message}
        {...register('problemStatement')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Target users or customers"
          error={errors.targetCustomer?.message}
          {...register('targetCustomer')}
        />
        <TextField
          label="How did you hear about us?"
          error={errors.referralSource?.message}
          {...register('referralSource')}
        />
      </div>

      <TextField
        label="Pitch video link"
        type="url"
        inputMode="url"
        required
        placeholder="https://"
        hint="A link to your pitch video on any video platform. Make sure the link is viewable by anyone who has it."
        error={errors.pitchVideoUrl?.message}
        {...register('pitchVideoUrl')}
      />

      {/* File input is managed outside react-hook-form; a File is not form state. */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="field-presentation" className="text-sm font-medium text-ink-800">
          Presentation
          <span className="ml-0.5 text-danger-700" aria-hidden="true">
            *
          </span>
        </label>
        <p id="field-presentation-hint" className="text-xs text-ink-500">
          {ACCEPTED_PRESENTATION_EXTENSIONS.join(', ')} up to {maxSizeLabel}. Stored
          privately and visible only to the team reviewing your application.
        </p>
        <input
          id="field-presentation"
          ref={fileInputRef}
          name="presentation"
          type="file"
          required
          accept={ACCEPTED_PRESENTATION_EXTENSIONS.join(',')}
          onChange={onFileChange}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={
            fileError
              ? 'field-presentation-hint field-presentation-error'
              : 'field-presentation-hint'
          }
          className={`w-full rounded-lg border bg-white text-sm text-ink-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-ink-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-ink-800 hover:file:bg-ink-200 ${
            fileError ? 'border-danger-700' : 'border-ink-300'
          }`}
        />
        {selectedFile && !fileError ? (
          <p className="text-xs text-ink-600">
            Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        ) : null}
        {fileError ? (
          <p
            id="field-presentation-error"
            role="alert"
            className="text-sm text-danger-700"
          >
            {fileError}
          </p>
        ) : null}
      </div>

      <Callout tone="info" title="Before you submit">
        Submitting an application does not guarantee selection or support, and does not
        create any partnership or investment arrangement. If you need a confidentiality
        agreement in place first, contact us before submitting.
      </Callout>

      <CheckboxField
        label="I agree that my application, presentation and pitch video link may be stored and reviewed by the team for the purpose of assessing this application."
        required
        error={errors.consent?.message}
        {...register('consent')}
      />
    </FormShell>
  );
}
