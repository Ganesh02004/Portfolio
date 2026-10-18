import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';
import { asPublic } from '@/lib/db/client';
import { serverEnv } from '@/lib/env';

/**
 * Email delivery.
 *
 * The guiding rule is that a submission is never lost because email failed.
 * `sendEmail` therefore does not throw: it records the outcome in
 * email_delivery_logs and returns a result, leaving the caller free to
 * acknowledge the visitor regardless.
 *
 * Only a masked recipient and the template name are logged. Message bodies and
 * full addresses are not retained.
 */

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const env = serverEnv();
  const auth =
    env.SMTP_USER && env.SMTP_PASSWORD
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(auth ? { auth } : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return transporter;
}

export function resetMailer(): void {
  transporter?.close();
  transporter = null;
}

/** Masks an address for logging: alice@example.com → a***e@example.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Template identifier recorded in the delivery log. */
  template: string;
  replyTo?: string;
  subject_table?: 'service_submissions' | 'startup_applications';
  subject_id?: string;
}

export interface SendResult {
  delivered: boolean;
  error?: string;
}

async function recordDelivery(
  message: EmailMessage,
  status: 'SENT' | 'FAILED',
  errorMessage?: string,
): Promise<void> {
  try {
    await asPublic((client) =>
      client.query(
        `INSERT INTO email_delivery_logs
           (subject_table, subject_id, template, recipient_hint, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          message.subject_table ?? null,
          message.subject_id ?? null,
          message.template,
          maskEmail(message.to),
          status,
          errorMessage ?? null,
        ],
      ),
    );
  } catch (error) {
    // A logging failure must not escalate into a request failure.
    console.error('[email] could not record delivery outcome', {
      template: message.template,
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/**
 * Sends one message. Never throws — inspect the returned result.
 *
 * One retry is attempted for transient failures, which covers a provider
 * blip without turning a hard rejection into a slow request.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const env = serverEnv();
  const maxAttempts = 2;
  let lastError = 'unknown error';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await getTransporter().sendMail({
        from: env.FROM_EMAIL,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });

      await recordDelivery(message, 'SENT');
      return { delivered: true };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'unknown error';
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  console.error('[email] delivery failed', {
    template: message.template,
    recipient: maskEmail(message.to),
    error: lastError,
  });
  await recordDelivery(message, 'FAILED', lastError.slice(0, 500));

  return { delivered: false, error: lastError };
}
