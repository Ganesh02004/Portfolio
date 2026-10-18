/**
 * Creates sample submissions so the admin end-to-end tests have deterministic
 * records to open, filter and triage.
 *
 * Re-running resets the fixtures: statuses go back to RECEIVED, internal notes
 * are cleared, prior audit events are removed, and the presentation file is
 * rewritten under a fresh key. Without that reset a second run would inherit
 * the first run's mutations and the triage and download journeys would assert
 * against stale state.
 *
 * This is test scaffolding, not application seed data. It refuses to run
 * unless the database name ends with `_test`, so it cannot pollute a
 * development or production database.
 *
 *   npx tsx scripts/seed-test-data.ts
 */

import { Client } from 'pg';

const PDF_BYTES = Buffer.from(
  '%PDF-1.7\n%\xe2\xe3\xcf\xd3\nseeded presentation\n',
  'latin1',
);

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_ADMIN_URL;
  if (!connectionString) {
    console.error('[test-data] DATABASE_ADMIN_URL is required');
    process.exit(1);
  }

  const databaseName = new URL(connectionString).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    console.error(
      `[test-data] REFUSING TO RUN against "${databaseName}". ` +
        'The database name must end with "_test".',
    );
    process.exit(1);
  }

  const client = new Client({ connectionString, application_name: 'bsp-test-data' });
  await client.connect();

  try {
    const submissions = [
      {
        reference: 'GEN-2610-SEEDAA',
        type: 'CONTACT',
        name: 'Seeded Contact',
        email: 'seeded-contact@example.test',
        option: 'General question',
        message: 'Seeded contact inquiry for end-to-end tests.',
      },
      {
        reference: 'TRN-2610-SEEDBB',
        type: 'TRAINING',
        name: 'Seeded Trainee',
        email: 'seeded-training@example.test',
        option: 'GENERAL_TRAINING_WITH_SUPPORT',
        message: 'Seeded training inquiry for end-to-end tests.',
      },
      {
        reference: 'MKT-2610-SEEDCC',
        type: 'MARKETING',
        name: 'Seeded Marketer',
        email: 'seeded-marketing@example.test',
        option: 'six-month',
        message: 'Seeded marketing inquiry for end-to-end tests.',
      },
      {
        reference: 'DIG-2610-SEEDDD',
        type: 'DIGITALIZATION',
        name: 'Seeded Retailer',
        email: 'seeded-digital@example.test',
        option: 'ECOMMERCE_LISTING',
        message: 'Seeded digitalization inquiry for end-to-end tests.',
      },
    ];

    for (const submission of submissions) {
      await client.query(
        `INSERT INTO service_submissions
           (reference_code, submission_type, full_name, email, selected_option,
            message, source_page, consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, '/seed', now())
         ON CONFLICT (reference_code) DO UPDATE
           SET status = 'RECEIVED',
               internal_notes = NULL,
               assigned_to = NULL,
               full_name = EXCLUDED.full_name,
               selected_option = EXCLUDED.selected_option,
               message = EXCLUDED.message`,
        [
          submission.reference,
          submission.type,
          submission.name,
          submission.email,
          submission.option,
          submission.message,
        ],
      );
    }

    // A startup application whose presentation bytes live in the database,
    // so the admin download journey exercises the real path.
    await client.query(
      `INSERT INTO startup_applications
         (reference_code, applicant_name, email, startup_name, idea_title, idea_summary,
          problem_statement, target_customer, pitch_video_url,
          presentation_filename, presentation_size_bytes, presentation_mime_type,
          consent_at)
       VALUES ('STU-2610-SEEDEE', 'Seeded Founder', 'seeded-founder@example.test',
               'Seeded Startup', 'A seeded idea for end-to-end tests',
               'A seeded idea summary that is comfortably longer than the minimum length the validator requires.',
               'Seeded problem statement.', 'Seeded target customers.',
               'https://example.test/seeded-pitch', 'seeded-pitch.pdf', $1,
               'application/pdf', now())
       ON CONFLICT (reference_code) DO UPDATE
         SET status = 'RECEIVED',
             internal_notes = NULL,
             reviewed_by = NULL,
             reviewed_at = NULL,
             presentation_size_bytes = EXCLUDED.presentation_size_bytes`,
      [PDF_BYTES.length],
    );

    await client.query(
      `INSERT INTO startup_presentations (application_id, content)
       SELECT id, $1 FROM startup_applications WHERE reference_code = 'STU-2610-SEEDEE'
       ON CONFLICT (application_id) DO UPDATE SET content = EXCLUDED.content`,
      [PDF_BYTES],
    );

    // Audit history belongs to the previous run, not this one.
    await client.query(
      `DELETE FROM submission_events
        WHERE subject_id IN (
          SELECT id FROM service_submissions WHERE source_page = '/seed'
          UNION ALL
          SELECT id FROM startup_applications WHERE reference_code = 'STU-2610-SEEDEE'
        )`,
    );

    console.info(
      `[test-data] seeded ${submissions.length} submission(s) and 1 startup application`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[test-data] failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
