// lib/jwt.ts
import { createHash }           from "node:crypto";
import { jwtVerify, SignJWT }   from "npm:jose";
import { type AuthPayload, isAuthPayload } from "../model/interfaces.ts";

// Clef secrète — à externaliser en variable d'environnement plus tard
const JWT_SECRET = "***REMOVED***";
const JWT_KEY    = new TextEncoder().encode(JWT_SECRET);

// ── Crée un JWT signé HS256, valide 24h ──────────────────────────────────
export async function createJWT(
  payload: Omit<AuthPayload, "exp">,
): Promise<string> {
  return await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_KEY);
}

// ── Vérifie un JWT et retourne son payload, ou null si invalide ──────────
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return isAuthPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

// ── Hash SHA-256 (cohérent avec usr_mdp en BDD) ──────────────────────────
export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}
