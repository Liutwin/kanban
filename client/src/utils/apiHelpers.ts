// src/utils/apiHelpers.ts

/**
 * Traduit un code HTTP en message d'erreur lisible par l'utilisateur.
 *
 * Couvre les cas les plus courants rencontrés dans l'application :
 * - 400 : données envoyées invalides
 * - 401 : session expirée
 * - 403 : droits insuffisants
 * - 404 : ressource introuvable
 * - 409 : conflit (ex. doublon)
 * - 5xx : erreur côté serveur
 *
 * @param status - Code HTTP de la réponse.
 * @returns Message d'erreur en français destiné à être affiché à l'utilisateur.
 */
export function httpErrorMessage(status: number): string {
  switch (status) {
    case 400: return "Données invalides. Vérifiez les champs saisis.";
    case 401: return "Session expirée. Veuillez vous reconnecter.";
    case 403: return "Vous n'avez pas accès à cette ressource.";
    case 404: return "La ressource demandée est introuvable.";
    case 409: return "Un conflit existe déjà (doublon ou contrainte).";
    default:
      if (status >= 500) return "Le serveur a rencontré une erreur. Réessayez dans quelques instants.";
      return `Erreur inattendue (${status}).`;
  }
}

/**
 * Tente de parser le body JSON d'une réponse non-ok et retourne
 * le message d'erreur du serveur si disponible, sinon traduit le code HTTP.
 *
 * @param res - La réponse HTTP en erreur (`res.ok === false`).
 * @returns Message d'erreur prêt à être affiché à l'utilisateur.
 */
export async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const json = await res.json();
    // Spring renvoie parfois { message: "..." } ou { error: { message: "..." } }
    const serverMsg: string | undefined =
      json?.message ?? json?.error?.message;
    if (serverMsg) return serverMsg;
  } catch {
    // body non-JSON ou déjà consommé, on ignore
  }
  return httpErrorMessage(res.status);
}