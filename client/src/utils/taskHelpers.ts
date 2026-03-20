/**
 * @file taskHelpers.ts
 * Fonctions utilitaires pures pour l'affichage des tâches Kanban.
 * Aucune dépendance React — testables unitairement sans rendu.
 */

import type { Priority } from "../model/interfaces";

// ─────────────────────────────────────────────────────────────────────────────
// Priorité
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne la classe CSS du badge de priorité.
 * @param p - Niveau de priorité de la tâche.
 */
export const priorityClass = (p: Priority): string =>
  p === "haute" ? "badge-haute" : p === "moyenne" ? "badge-moyenne" : "badge-basse";

/**
 * Retourne le libellé affiché dans le badge de priorité.
 * @param p - Niveau de priorité de la tâche.
 */
export const priorityLabel = (p: Priority): string =>
  p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moyenne" : "↓ Basse";

// ─────────────────────────────────────────────────────────────────────────────
// Dates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate une date ISO en "JJ mois" à la française (ex : "15 jan.").
 * @returns `null` si `dt` est absent ou vide.
 */
export const formatDate = (dt: string | null | undefined): string | null =>
  dt
    ? new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
    : null;

/**
 * Indique si une date d'échéance est dépassée par rapport à maintenant.
 * @param dt - Date ISO de l'échéance (`null`/`undefined` → retourne `false`).
 */
export const isOverdue = (dt: string | null | undefined): boolean =>
  dt ? new Date(dt) < new Date() : false;

/**
 * Retourne une description lisible du retard.
 *
 * Exemples : "En retard de 5 min", "En retard de 3h", "En retard de 2j".
 * @param dt - Date ISO de l'échéance (doit être dans le passé).
 */
export const overdueLabel = (dt: string): string => {
  const diff   = Date.now() - new Date(dt).getTime();
  const mins   = Math.floor(diff / 60_000);
  if (mins  <  60) return `En retard de ${mins} min`;
  const hrs  = Math.floor(mins  / 60);
  if (hrs   <  24) return `En retard de ${hrs}h`;
  const days = Math.floor(hrs   / 24);
  if (days  <  30) return `En retard de ${days}j`;
  return `En retard de ${Math.floor(days / 30)} mois`;
};
