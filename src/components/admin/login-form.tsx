'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signInAction, type ActionResult } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { TextField } from '@/components/ui/field';

/**
 * Sign-in form.
 *
 * Built on a server action so it works without client JavaScript: the form
 * posts, the server authenticates, and the redirect happens server-side. The
 * client layer only adds a pending state.
 */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signInAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <TextField
        label="Email address"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
      />

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      <div aria-live="polite" aria-atomic="true">
        {state && !state.ok ? (
          <Callout tone="danger" title="Could not sign in">
            {state.message}
          </Callout>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
