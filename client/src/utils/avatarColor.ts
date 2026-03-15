/**
 * Génère une couleur d'avatar déterministe basée sur un userId.
 * La même couleur est utilisée partout dans l'application.
 *
 * Chaque paire de couleurs forme un dégradé 135° distinct et lisible sur fond sombre.
 */

const GRADIENTS: [string, string][] = [
  ["#7c6ff0", "#64d2c8"],  // 0 — indigo → teal
  ["#dc643c", "#f0a050"],  // 1 — terracotta → orange
  ["#3a9fd0", "#70d4f0"],  // 2 — bleu → ciel
  ["#b44090", "#e060b0"],  // 3 — rose fuchsia
  ["#38a87a", "#70d4a0"],  // 4 — vert émeraude
  ["#c8a020", "#e8c840"],  // 5 — doré vif
  ["#a03030", "#d06060"],  // 6 — rouge brique
];

/**
 * Multiplie par 3 (coprime avec 7) pour que des IDs consécutifs
 * obtiennent des couleurs éloignées dans le tableau.
 * Ex : IDs 1,2,3,4 → indices 3,6,2,5 — jamais deux couleurs adjacentes.
 */

export interface AvatarStyle {
  background: string;   // dégradé CSS utilisable en style inline
  color: string;        // couleur du texte (toujours sombre)
  from: string;         // couleur de départ du dégradé
  to: string;           // couleur d'arrivée du dégradé
}

/**
 * Retourne le style d'avatar pour un utilisateur donné.
 * @param userId  identifiant numérique de l'utilisateur
 */
export function getAvatarStyle(userId: number): AvatarStyle {
  const [from, to] = GRADIENTS[(userId * 3) % GRADIENTS.length];
  return {
    background: `linear-gradient(135deg, ${from}, ${to})`,
    color: "#1c1b1f",
    from,
    to,
  };
}