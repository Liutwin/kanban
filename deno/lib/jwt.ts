import { randomBytes, scrypt } from "node:crypto";
import { jwtVerify, SignJWT } from "@panva/jose";

import { type AuthPayload, isAuthPayload } from "../model/interfaces.ts";

// Clef secrète — à externaliser en variable d'environnement plus tard
const JWT_SECRET = "***REMOVED***";
const JWT_KEY    = new TextEncoder().encode(JWT_SECRET);

// Crée un jeton d'authentification
// Le jeton est hashé avec l'algorithme HMAC avec SHA-256 et une clef secrète
// Le jeton est valide pendant 24 heures et attribué à l'utilisateur contenu dans `payload`
export async function createJWT(
  payload: Omit<AuthPayload, "exp">,
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_KEY);
}

// Passe le jeton à la fonction `jwtVerify` de la bibliothèque de JSON Web Tokens
// Valide le type de l'objet retourné par `jwtVerify`, qui doit être conforme à `AuthPayload`
// Retourne le payload s'il est valide, `null` sinon
export async function verifyJWT(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return isAuthPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

// Produit le hash d'un mot de passe donné en paramètre
// Format : hash.salt
export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");

  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${derivedKey.toString("hex")}.${salt}`);
    });
  });
}

// Compare le mot de passe et le hash passés en paramètres, en ré-hashant le mot de passe
export function verifyPassword(password: string, storedHash: string,): Promise<boolean> {
  const [hash, salt] = storedHash.split(".");

  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(hash === derivedKey.toString("hex"));
    });
  });
}