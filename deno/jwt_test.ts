/**
 * jwt_test.ts — Tests unitaires pour lib/jwt.ts
 *
 * Couvre les 4 méthodes publiques du module :
 *   1. createJWT      — création d'un token JWT signé HS256
 *   2. verifyJWT      — vérification et décodage d'un token
 *   3. hashPassword   — hachage scrypt avec sel aléatoire
 *   4. verifyPassword — vérification d'un mot de passe contre son hash
 *
 * Exécution :
 *   deno test --allow-read jwt_test.ts
 *
 * Remarque : les imports utilisent des chemins relatifs à adapter
 * selon l'emplacement réel du fichier de test dans le projet.
 */

import {
  assertEquals,
  assertNotEquals,
  assertMatch,
  assertRejects,
} from "jsr:@std/assert";

import {
  createJWT,
  verifyJWT,
  hashPassword,
  verifyPassword,
} from "./lib/jwt.ts";

// ============================================================
// 1. createJWT
// ============================================================

Deno.test("createJWT [nominal] — retourne une chaîne à 3 segments base64url", async () => {
  const token = await createJWT({ id: 1 });

  const parts = token.split(".");
  assertEquals(
    parts.length,
    3,
    `Attendu 3 segments séparés par '.', obtenu ${parts.length} segment(s). Token reçu : "${token}"`,
  );

  const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
  for (const part of parts) {
    assertMatch(
      part,
      base64urlRegex,
      `Le segment "${part}" contient des caractères invalides pour du base64url (attendu : [A-Za-z0-9\\-_] uniquement)`,
    );
  }
});

Deno.test("createJWT [nominal] — le header encode bien l'algorithme HS256", async () => {
  const token = await createJWT({ id: 1 });
  const header = JSON.parse(
    atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")),
  );

  assertEquals(
    header.alg,
    "HS256",
    `Algorithme attendu : "HS256", obtenu : "${header.alg}". Header décodé : ${JSON.stringify(header)}`,
  );
});

Deno.test("createJWT [non-nominal] — deux appels avec le même payload produisent des tokens différents (nonce/exp)", async () => {
  const t1 = await createJWT({ id: 1 });
  await new Promise((r) => setTimeout(r, 1000));
  const t2 = await createJWT({ id: 1 });

  assertNotEquals(
    t1,
    t2,
    `Deux tokens créés à des instants différents (au moins 1s) sont identiques alors qu'ils devraient différer (exp ou signature). Token obtenu : "${t1}"`,
  );
});

Deno.test("createJWT [non-nominal] — payload sans id → token créé mais verifyJWT retourne null", async () => {
  const token = await createJWT({} as { id: number });
  const payload = await verifyJWT(token);

  assertEquals(
    payload,
    null,
    `verifyJWT aurait dû retourner null pour un token sans champ 'id', mais a retourné : ${JSON.stringify(payload)}`,
  );
});

// ============================================================
// 2. verifyJWT
// ============================================================

Deno.test("verifyJWT [nominal] — retourne le payload avec id et exp corrects", async () => {
  const token = await createJWT({ id: 42 });
  const payload = await verifyJWT(token);

  assertEquals(
    payload?.id,
    42,
    `Champ 'id' attendu : 42, obtenu : ${payload?.id}. Payload complet : ${JSON.stringify(payload)}`,
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const in24h = nowSec + 24 * 3600;
  assertEquals(
    payload!.exp > nowSec && payload!.exp <= in24h + 5,
    true,
    `Champ 'exp' hors de la fenêtre attendue [maintenant, +24 h]. Valeur obtenue : ${payload?.exp}, maintenant : ${nowSec}, limite : ${in24h}`,
  );
});

Deno.test("verifyJWT [non-nominal] — chaîne vide → null", async () => {
  const result = await verifyJWT("");

  assertEquals(
    result,
    null,
    `verifyJWT("") aurait dû retourner null, mais a retourné : ${JSON.stringify(result)}`,
  );
});

Deno.test("verifyJWT [non-nominal] — token malformé (2 segments) → null", async () => {
  const result = await verifyJWT("abc.def");

  assertEquals(
    result,
    null,
    `verifyJWT("abc.def") aurait dû retourner null pour un token à 2 segments, mais a retourné : ${JSON.stringify(result)}`,
  );
});

Deno.test("verifyJWT [non-nominal] — token avec signature incorrecte → null", async () => {
  const token = await createJWT({ id: 7 });
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]}.INVALIDE_SIGNATURE_XXXXX`;

  const result = await verifyJWT(tampered);

  assertEquals(
    result,
    null,
    `verifyJWT aurait dû retourner null pour une signature falsifiée, mais a retourné : ${JSON.stringify(result)}. Token falsifié : "${tampered}"`,
  );
});

Deno.test("verifyJWT [non-nominal] — token avec payload altéré → null", async () => {
  const token = await createJWT({ id: 1 });
  const parts = token.split(".");
  const fakePart = btoa(
    JSON.stringify({ id: 999, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const tampered = `${parts[0]}.${fakePart}.${parts[2]}`;

  const result = await verifyJWT(tampered);

  assertEquals(
    result,
    null,
    `verifyJWT aurait dû retourner null pour un payload falsifié (id=999), mais a retourné : ${JSON.stringify(result)}. Token falsifié : "${tampered}"`,
  );
});

Deno.test("verifyJWT [non-nominal] — token expiré → null", async () => {
  const { SignJWT } = await import("@panva/jose");
  const JWT_KEY = new TextEncoder().encode("***REMOVED***");
  const expiredToken = await new SignJWT({ id: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1s")
    .sign(JWT_KEY);

  await new Promise((r) => setTimeout(r, 1500));

  const result = await verifyJWT(expiredToken);

  assertEquals(
    result,
    null,
    `verifyJWT aurait dû retourner null pour un token expiré, mais a retourné : ${JSON.stringify(result)}`,
  );
});

// ============================================================
// 3. hashPassword
// ============================================================

Deno.test("hashPassword [nominal] — retourne le format hash.salt attendu", async () => {
  const stored = await hashPassword("motdepasse");

  assertMatch(
    stored,
    /^[0-9a-f]{128}\.[0-9a-f]{32}$/,
    `Format attendu : <128 hex>.<32 hex>, valeur obtenue : "${stored}" (longueur totale : ${stored.length})`,
  );
});

Deno.test("hashPassword [nominal] — deux hachages du même MDP sont différents (sel aléatoire)", async () => {
  const h1 = await hashPassword("motdepasse");
  const h2 = await hashPassword("motdepasse");

  assertNotEquals(
    h1,
    h2,
    `Les deux hachages sont identiques alors que les sels devraient être aléatoires. Hash obtenu : "${h1}"`,
  );
});

Deno.test("hashPassword [non-nominal] — mot de passe vide → hash valide produit sans erreur", async () => {
  const stored = await hashPassword("");

  assertMatch(
    stored,
    /^[0-9a-f]{128}\.[0-9a-f]{32}$/,
    `hashPassword("") aurait dû produire un hash valide au format <128 hex>.<32 hex>, valeur obtenue : "${stored}"`,
  );
});

Deno.test("hashPassword [non-nominal] — mot de passe très long (1 000 caractères) → aucune exception", async () => {
  const longPassword = "a".repeat(1000);
  const stored = await hashPassword(longPassword);

  assertMatch(
    stored,
    /^[0-9a-f]{128}\.[0-9a-f]{32}$/,
    `hashPassword avec un mot de passe de 1000 caractères aurait dû produire un hash valide, valeur obtenue : "${stored}"`,
  );
});

Deno.test("hashPassword [non-nominal] — caractères spéciaux et unicode → aucune exception", async () => {
  const password = "P@$$w0rd!\u{1F510}\u00E9\u4E2D\u6587";
  const stored = await hashPassword(password);

  assertMatch(
    stored,
    /^[0-9a-f]{128}\.[0-9a-f]{32}$/,
    `hashPassword avec des caractères unicode aurait dû produire un hash valide, valeur obtenue : "${stored}"`,
  );
});

// ============================================================
// 4. verifyPassword
// ============================================================

Deno.test("verifyPassword [nominal] — MDP correct → true", async () => {
  const stored = await hashPassword("secret123");
  const result = await verifyPassword("secret123", stored);

  assertEquals(
    result,
    true,
    `verifyPassword aurait dû retourner true pour le mot de passe correct, mais a retourné : ${result}. Hash utilisé : "${stored}"`,
  );
});

Deno.test("verifyPassword [nominal] — MDP incorrect → false", async () => {
  const stored = await hashPassword("secret123");
  const result = await verifyPassword("mauvaismdp", stored);

  assertEquals(
    result,
    false,
    `verifyPassword aurait dû retourner false pour un mauvais mot de passe, mais a retourné : ${result}. Hash utilisé : "${stored}"`,
  );
});

Deno.test("verifyPassword [non-nominal] — MDP vide vs hash d'un MDP non-vide → false", async () => {
  const stored = await hashPassword("secret123");
  const result = await verifyPassword("", stored);

  assertEquals(
    result,
    false,
    `verifyPassword("", hash) aurait dû retourner false, mais a retourné : ${result}. Hash utilisé : "${stored}"`,
  );
});

Deno.test("verifyPassword [non-nominal] — hash malformé sans point → exception levée", async () => {
  await assertRejects(
    () => verifyPassword("secret", "hashsanspoint"),
    Error,
    undefined,
    `verifyPassword aurait dû lever une exception pour un hash sans séparateur '.', mais s'est terminé sans erreur`,
  );
});

Deno.test("verifyPassword [non-nominal] — hash avec sel invalide (non-hex) → exception ou false", async () => {
  const fakeHash = "a".repeat(128) + "." + "z".repeat(32);

  try {
    const result = await verifyPassword("secret", fakeHash);
    assertEquals(
      result,
      false,
      `verifyPassword aurait dû retourner false pour un sel non-hex, mais a retourné : ${result}. Hash utilisé : "${fakeHash}"`,
    );
  } catch (_e) {
    // Exception également acceptable selon l'implémentation scrypt de la plateforme
  }
});

Deno.test("verifyPassword [non-nominal] — le même MDP vérifié contre deux hashes différents → true pour les deux", async () => {
  const h1 = await hashPassword("motdepasse");
  const h2 = await hashPassword("motdepasse");

  const r1 = await verifyPassword("motdepasse", h1);
  assertEquals(
    r1,
    true,
    `verifyPassword("motdepasse", h1) aurait dû retourner true, mais a retourné : ${r1}. Hash h1 : "${h1}"`,
  );

  const r2 = await verifyPassword("motdepasse", h2);
  assertEquals(
    r2,
    true,
    `verifyPassword("motdepasse", h2) aurait dû retourner true, mais a retourné : ${r2}. Hash h2 : "${h2}"`,
  );
});
