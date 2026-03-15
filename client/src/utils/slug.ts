/**
 * Convertit un nom de tableau en slug URL-friendly.
 *
 * Exemples :
 * - `"Mon Projet Web"`  → `"mon-projet-web"`
 * - `"Développement félin"` → `"developpement-felin"`
 * - `"  To-Do List!!! "` → `"to-do-list"`
 *
 * @param name - Le nom brut à transformer.
 * @returns Le slug en minuscules, sans accents, sans caractères spéciaux.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // supprime les diacritiques (accents)
    .replace(/[^a-z0-9]+/g, "-")       // remplace tout caractère non alphanumérique par un tiret
    .replace(/^-|-$/g, "");            // retire les tirets en début et fin
}