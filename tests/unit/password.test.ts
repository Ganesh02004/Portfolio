import { describe, expect, it } from 'vitest';
import { hashPassword, needsRehash, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(
      true,
    );
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('produces a different hash for the same password each time', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ]);
    expect(first).not.toBe(second);
  });

  it('stores parameters in the encoded hash', async () => {
    const hash = await hashPassword('x'.repeat(16));
    expect(hash.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
  });

  it('normalizes unicode so equivalent passwords match', async () => {
    // U+00E9 vs e + U+0301 — the same character, different byte sequences.
    const hash = await hashPassword('café');
    await expect(verifyPassword('café', hash)).resolves.toBe(true);
  });

  it('returns false rather than throwing for a malformed hash', async () => {
    for (const bad of ['', 'not-a-hash', 'scrypt$1$2$3', 'bcrypt$1$2$3$a$b']) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false);
    }
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('CaseSensitive123');
    await expect(verifyPassword('casesensitive123', hash)).resolves.toBe(false);
  });
});

describe('needsRehash', () => {
  it('is false for a hash at current parameters', async () => {
    const hash = await hashPassword('current parameters');
    expect(needsRehash(hash)).toBe(false);
  });

  it('is true for a hash with a lower cost factor', () => {
    expect(needsRehash('scrypt$16384$8$1$c2FsdA$aGFzaA')).toBe(true);
  });

  it('is true for an unparseable hash', () => {
    expect(needsRehash('garbage')).toBe(true);
  });
});
