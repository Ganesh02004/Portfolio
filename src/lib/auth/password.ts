import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing using scrypt from Node's standard library.
 *
 * scrypt is memory-hard and ships with Node, so the platform needs no native
 * build step for argon2 or bcrypt. Parameters are stored inside the hash
 * string, which means the cost can be raised later and existing hashes stay
 * verifiable — `needsRehash` reports when a stored hash is below the current
 * policy so it can be upgraded on next sign-in.
 *
 * Encoded form: scrypt$N$r$p$<salt base64url>$<hash base64url>
 */

const CURRENT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// scrypt needs roughly 128 * N * r bytes; allow headroom over that.
const MAX_MEM = 256 * CURRENT_PARAMS.N * CURRENT_PARAMS.r;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...CURRENT_PARAMS,
    maxmem: MAX_MEM,
  });

  return [
    'scrypt',
    CURRENT_PARAMS.N,
    CURRENT_PARAMS.r,
    CURRENT_PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function parseHash(encoded: string): ParsedHash | null {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (N < 2 || r < 1 || p < 1) return null;
  if (!rawSalt || !rawHash) return null;

  try {
    return {
      N,
      r,
      p,
      salt: Buffer.from(rawSalt, 'base64url'),
      hash: Buffer.from(rawHash, 'base64url'),
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a password against a stored hash in constant time.
 *
 * Returns false for malformed hashes rather than throwing, so a corrupt row
 * cannot be used to distinguish "no such user" from "bad stored hash".
 */
export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parsed = parseHash(encoded);
  if (!parsed) return false;

  try {
    const derived = await scrypt(
      password.normalize('NFKC'),
      parsed.salt,
      parsed.hash.length,
      {
        N: parsed.N,
        r: parsed.r,
        p: parsed.p,
        maxmem: Math.max(MAX_MEM, 256 * parsed.N * parsed.r),
      },
    );
    return derived.length === parsed.hash.length && timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}

/** True when a stored hash was produced with weaker parameters than current policy. */
export function needsRehash(encoded: string): boolean {
  const parsed = parseHash(encoded);
  if (!parsed) return true;
  return (
    parsed.N < CURRENT_PARAMS.N ||
    parsed.r < CURRENT_PARAMS.r ||
    parsed.p < CURRENT_PARAMS.p
  );
}
