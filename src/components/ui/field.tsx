'use client';

import { useId, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/utils';

/**
 * Form field primitives.
 *
 * Every control gets a real <label for>, errors are wired through
 * aria-describedby and announced via role="alert", and the invalid state is
 * carried by aria-invalid as well as colour — so the error is conveyed to
 * screen readers and to anyone who cannot distinguish the red border.
 */

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger-700" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-ink-500">(optional)</span>
        )}
      </label>

      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}

      {children}

      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-danger-700"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mt-0.5 size-3.5 shrink-0 fill-current"
          >
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.75 10.5h-1.5V10h1.5v1.5Zm0-2.75h-1.5v-4h1.5v4Z" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-ink-900 ' +
  'placeholder:text-ink-400 transition-colors ' +
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500';

const controlState = (hasError: boolean) =>
  hasError
    ? 'border-danger-700 focus:border-danger-700'
    : 'border-ink-300 hover:border-ink-400 focus:border-teal-600';

function describedBy(
  id: string,
  hasError: boolean,
  hasHint: boolean,
): string | undefined {
  const ids = [hasHint ? `${id}-hint` : null, hasError ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(' ') : undefined;
}

type NativeInputProps = Omit<React.ComponentProps<'input'>, 'id' | 'className'>;

export interface TextFieldProps extends NativeInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** react-hook-form register() supplies this. */
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  hint,
  required,
  ref,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const id = props.name ? `field-${props.name}` : generatedId;

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <input
        id={id}
        ref={ref}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(error), Boolean(hint))}
        className={cn(controlBase, controlState(Boolean(error)))}
        {...props}
      />
    </FieldShell>
  );
}

type NativeTextareaProps = Omit<React.ComponentProps<'textarea'>, 'id' | 'className'>;

export interface TextAreaFieldProps extends NativeTextareaProps {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  rows = 5,
  ref,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const id = props.name ? `field-${props.name}` : generatedId;

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(error), Boolean(hint))}
        className={cn(controlBase, controlState(Boolean(error)), 'resize-y')}
        {...props}
      />
    </FieldShell>
  );
}

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'id' | 'className'>;

export interface SelectFieldProps extends NativeSelectProps {
  label: string;
  error?: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  ref,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const id = props.name ? `field-${props.name}` : generatedId;

  return (
    <FieldShell label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <select
        id={id}
        ref={ref}
        required={required}
        defaultValue={props.defaultValue ?? ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(error), Boolean(hint))}
        className={cn(controlBase, controlState(Boolean(error)), 'pr-9')}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export interface CheckboxFieldProps extends Omit<
  React.ComponentProps<'input'>,
  'id' | 'className' | 'type'
> {
  label: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function CheckboxField({
  label,
  error,
  required,
  ref,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId();
  const id = props.name ? `field-${props.name}` : generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'mt-0.5 size-4 shrink-0 rounded border-ink-400 text-navy-900',
            'accent-navy-900',
            error && 'border-danger-700',
          )}
          {...props}
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink-700">
          {label}
        </label>
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="ml-6.5 text-sm text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Honeypot: hidden from sighted users and from assistive technology, so only
 * an automated client fills it in. `aria-hidden` plus `tabIndex={-1}` keeps it
 * out of the keyboard order; `display:none` alone is skipped by some bots.
 */
export function HoneypotField({ ref }: { ref?: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="field-website">Leave this field empty</label>
      <input
        id="field-website"
        name="website"
        ref={ref}
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
