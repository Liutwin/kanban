/**
 * @file kanban.ts
 * Types internes utilisés par le Dashboard et ses sous-composants.
 * Séparés de `interfaces.ts` (types API) car ces types n'existent
 * que côté client et ne correspondent à aucune réponse du serveur.
 */

import type { Column, Task, Priority } from "./interfaces";

// ─────────────────────────────────────────────────────────────────────────────
// Colonnes enrichies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * {@link Column} étendue avec ses tâches déjà chargées depuis l'API.
 * C'est l'unité de travail principale du Dashboard.
 */
export interface ColumnWithTasks extends Column {
  tasks: Task[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag & drop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cible de drop pour les tâches.
 * `beforeTaskId === null` signifie « insérer en fin de colonne ».
 */
export interface DropTarget {
  colId: number;
  beforeTaskId: number | null;
}

/**
 * État du mirror de drag : ghost personnalisé qui suit le curseur
 * en remplacement du ghost natif du navigateur.
 *
 * - `kind: "task"` → on drague une carte tâche.
 * - `kind: "col"`  → on drague une colonne entière.
 * - `ox` / `oy`   → offset du clic par rapport au coin supérieur gauche
 *                    de l'élément (pour aligner le mirror sur le curseur).
 * - `width`        → largeur de l'élément source (pour que le mirror ait
 *                    la même taille que l'original).
 */
export type DragMirrorState =
  | { kind: "task"; task: Task;               ox: number; oy: number; width: number }
  | { kind: "col";  col:  ColumnWithTasks;    ox: number; oy: number; width: number };

// ─────────────────────────────────────────────────────────────────────────────
// Formulaires
// ─────────────────────────────────────────────────────────────────────────────

/** État du formulaire de création de tâche. */
export interface TaskFormState {
  title:    string;
  details:  string;
  dueDate:  string;
  dueTime:  string;
  priority: Priority;
}
