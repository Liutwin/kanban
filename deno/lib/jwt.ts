import { randomBytes, scrypt } from "node:crypto";
import { jwtVerify, SignJWT } from "@panva/jose";

import { type AuthPayload, isAuthPayload } from "../model/interfaces.ts";

/** Clef secrète — à externaliser en variable d'environnement plus tard */
const JWT_SECRET = "***REMOVED***";
const JWT_KEY    = new TextEncoder().encode(JWT_SECRET);

/**
 * Crée un jeton d'authentification signé avec HMAC-SHA256.
 * Le jeton est valide pendant 24 heures.
 *
 * @param payload - Données utilisateur à embarquer dans le jeton (sans `exp`).
 * @returns Le jeton JWT signé sous forme de chaîne.
 */
export async function createJWT(
  payload: Omit<AuthPayload, "exp">,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_KEY);
}

/**
 * Vérifie un jeton JWT et retourne son payload s'il est valide.
 *
 * @param token - Le jeton JWT à vérifier.
 * @returns Le payload typé `AuthPayload` si le jeton est valide et bien formé, `null` sinon.
 */
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return isAuthPayload(payload) ? payload : null;
  } catch (e) {
    console.error("[JWT] verifyJWT error:", e);
    return null;
  }
}

/**
 * Fonction interne : applique scrypt sur un mot de passe et un sel donnés.
 * Factorise la logique commune à `hashPassword` et `verifyPassword`.
 *
 * @param password - Le mot de passe en clair.
 * @param salt - Le sel hexadécimal à utiliser pour la dérivation.
 * @returns Le résultat de scrypt encodé en hexadécimal (64 octets → 128 caractères).
 */
function computeScrypt(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex"));
    });
  });
}

/**
 * Hache un mot de passe avec scrypt et un sel aléatoire.
 *
 * @param password - Le mot de passe en clair à hacher.
 * @returns Une chaîne au format `hash.salt` prête à être stockée en base de données.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await computeScrypt(password, salt);
  return `${hash}.${salt}`;
}

/**
 * Vérifie qu'un mot de passe en clair correspond à un hash stocké.
 * Réutilise le sel contenu dans `storedHash` pour recalculer le hash et le comparer.
 *
 * @param password - Le mot de passe en clair à vérifier.
 * @param storedHash - Le hash stocké au format `hash.salt`.
 * @returns `true` si le mot de passe correspond, `false` sinon.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [hash, salt] = storedHash.split(".");
  const computed = await computeScrypt(password, salt);
  return hash === computed;
}