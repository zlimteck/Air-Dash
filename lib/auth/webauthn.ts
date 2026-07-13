import "server-only";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const RP_NAME = "Air-Dash";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function rpConfig() {
  const url = new URL(env().APP_ORIGIN);
  return { rpID: url.hostname, expectedOrigin: url.origin };
}

// In-memory challenge store (single-instance deployment).
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

function storeChallenge(key: string, challenge: string): void {
  challenges.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}

function takeChallenge(key: string): string | null {
  const entry = challenges.get(key);
  challenges.delete(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}

export async function createRegistrationOptions(userId: string, email: string) {
  const existing = await db.webAuthnCredential.findMany({ where: { userId } });
  const { rpID } = rpConfig();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: email,
    attestationType: "none",
    excludeCredentials: existing.map((cred) => ({ id: cred.credentialId })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  storeChallenge(`reg:${userId}`, options.challenge);
  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName: string | null,
): Promise<boolean> {
  const challenge = takeChallenge(`reg:${userId}`);
  if (!challenge) return false;

  const { rpID, expectedOrigin } = rpConfig();

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });
  } catch {
    return false;
  }

  if (!verification.verified || !verification.registrationInfo) return false;

  const { credential, aaguid } = verification.registrationInfo;
  await db.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ? JSON.stringify(credential.transports) : null,
      deviceName,
      aaguid,
    },
  });
  return true;
}

export async function createAuthenticationOptions(userId: string) {
  const creds = await db.webAuthnCredential.findMany({ where: { userId } });
  if (creds.length === 0) return null;

  const { rpID } = rpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: creds.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    })),
  });

  storeChallenge(`auth:${userId}`, options.challenge);
  return options;
}

/**
 * Passwordless login, step 1: options with no allowCredentials — the
 * browser offers whatever discoverable passkeys it holds for this site.
 * The challenge is keyed by a random id since no user is known yet.
 * User verification is required: the passkey alone is the whole login,
 * so the authenticator must check biometrics/PIN (two factors in one).
 */
export async function createPasswordlessOptions() {
  const { rpID } = rpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
  });

  const challengeId = crypto.randomUUID();
  storeChallenge(`pwl:${challengeId}`, options.challenge);
  return { options, challengeId };
}

/**
 * Passwordless login, step 2: the credential id in the response tells us
 * who is signing in. Returns the userId, or null if verification fails.
 */
export async function verifyPasswordlessAuthentication(
  challengeId: string,
  response: AuthenticationResponseJSON,
): Promise<string | null> {
  const challenge = takeChallenge(`pwl:${challengeId}`);
  if (!challenge) return null;

  const credential = await db.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });
  if (!credential) return null;

  const { rpID, expectedOrigin } = rpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });
  } catch {
    return null;
  }

  if (!verification.verified) return null;

  await db.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });
  return credential.userId;
}

export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
): Promise<boolean> {
  const challenge = takeChallenge(`auth:${userId}`);
  if (!challenge) return false;

  const credential = await db.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });
  if (!credential || credential.userId !== userId) return false;

  const { rpID, expectedOrigin } = rpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });
  } catch {
    return false;
  }

  if (!verification.verified) return false;

  await db.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });
  return true;
}
