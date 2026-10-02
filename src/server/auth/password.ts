import { hash, verify } from "@node-rs/argon2";

// OWASP-recommended argon2id parameters (19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * A real hash of a throwaway password, verified against when the user doesn't
 * exist so login timing doesn't reveal which usernames are registered.
 */
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password-just-for-timing");
  return dummyHash;
}
