// src/utils/apiHelpers.ts
// Helper pour extraire un message d'erreur depuis une réponse APIFailure
import type { APIResponse } from "../model/types";

/**
 * Tente de parser le body JSON d'une réponse non-ok et retourne
 * le message d'erreur du serveur, ou le fallback fourni.
 */
export async function extractErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const json: APIResponse<unknown> = await res.json();
    if (!json.success && json.error?.message) return json.error.message;
  } catch {
    // body non-JSON, on ignore
  }
  return fallback;
}
