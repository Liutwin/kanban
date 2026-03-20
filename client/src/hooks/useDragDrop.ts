/**
 * @file useDragDrop.ts
 * Hook centralisant l'état et les handlers du drag & drop Kanban.
 *
 * Deux types de drag sont gérés indépendamment :
 * - **Tâches** : déplacement au sein d'une colonne ou entre colonnes.
 * - **Colonnes** : réordonnancement des colonnes du tableau.
 *
 * Dans les deux cas, le pattern est identique :
 * 1. Snapshot des colonnes au début du drag (rollback possible).
 * 2. Mise à jour optimiste de l'UI pendant le drag.
 * 3. Persistance via `boardFetch` (PATCH API) au drop.
 * 4. Rollback sur le snapshot en cas d'erreur réseau.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type React from "react";
import type { Task } from "../model/interfaces";
import type { ColumnWithTasks, DragMirrorState, DropTarget } from "../model/interfaces";
import { ROUTES_API } from "../config/api";

// ─────────────────────────────────────────────────────────────────────────────
// Interface publique du hook
// ─────────────────────────────────────────────────────────────────────────────

/** Options reçues par {@link useDragDrop}. */
interface UseDragDropOptions {
  /** État courant des colonnes (contrôlé par le parent). */
  columns:     ColumnWithTasks[];
  /** Setter de l'état des colonnes (depuis le parent). */
  setColumns:  React.Dispatch<React.SetStateAction<ColumnWithTasks[]>>;
  /** Fetch authentifié avec `X-Board-Id` pré-injecté. */
  boardFetch:  (url: RequestInfo, init?: RequestInit) => Promise<Response>;
  /** Rechargement complet du tableau, appelé en cas d'erreur réseau. */
  fetchBoard:  () => void;
  /** Identifiant du tableau courant. */
  boardId:     number;
  /** Si vrai, tous les handlers de drag ignorent les interactions. */
  isReadOnly:  boolean;
}

/** Valeurs et handlers exposés par {@link useDragDrop}. */
export interface UseDragDropReturn {
  // ── State (pour le rendu conditionnel) ─────────────────────────────────────
  dragTask:    Task | null;
  dragCol:     ColumnWithTasks | null;
  dragColOver: number | null;
  dropTarget:  DropTarget | null;
  dragMirror:  DragMirrorState | null;

  // ── Refs (accès stable dans les handlers sans déclencher de re-render) ─────
  mirrorRef:       React.RefObject<HTMLDivElement>;
  dragTaskRef:     React.MutableRefObject<Task | null>;
  dragColRef:      React.MutableRefObject<ColumnWithTasks | null>;
  columnsSnapshot: React.MutableRefObject<ColumnWithTasks[]>;
  didDrop:         React.MutableRefObject<boolean>;

  /** Canvas 1×1 transparent, passé à `setDragImage` pour masquer le ghost natif. */
  transparentPixel: HTMLCanvasElement;

  // ── Setters (pour les handlers inline dans les composants enfants) ─────────
  setDragTask:    React.Dispatch<React.SetStateAction<Task | null>>;
  setDragCol:     React.Dispatch<React.SetStateAction<ColumnWithTasks | null>>;
  setDragColOver: React.Dispatch<React.SetStateAction<number | null>>;
  setDropTarget:  React.Dispatch<React.SetStateAction<DropTarget | null>>;
  setDragMirror:  React.Dispatch<React.SetStateAction<DragMirrorState | null>>;

  /**
   * Prend un snapshot des colonnes courantes (à appeler dans `onDragStart`).
   * Garantit que `columnsSnapshot.current` est toujours frais au début d'un drag.
   */
  snapshotColumns: () => void;

  /**
   * Restaure l'état des colonnes depuis le snapshot pris au début du drag.
   * À appeler dans `onDragEnd` si le drop n'a pas abouti (`!didDrop.current`).
   */
  rollbackColumns: () => void;

  // ── Handlers métier ─────────────────────────────────────────────────────────
  handleDrop:       (targetColId: number, task: Task, targetTaskId?: number) => void;
  handleColDrop:    (targetCol: ColumnWithTasks) => void;
  reorderColLive:   (targetCol: ColumnWithTasks) => void;
  commitPosition:   (task: Task, col: ColumnWithTasks, rawValue: string) => void;
  startColAutoScroll: (el: HTMLElement, clientY: number) => void;
  stopColAutoScroll:  () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gère tout l'état et la logique du drag & drop du tableau Kanban.
 *
 * @param options - {@link UseDragDropOptions}
 * @returns       {@link UseDragDropReturn}
 */
export function useDragDrop({
  columns,
  setColumns,
  boardFetch,
  fetchBoard,
  boardId,
  isReadOnly,
}: UseDragDropOptions): UseDragDropReturn {

  // ── State du mirror (ghost personnalisé) ────────────────────────────────────
  const [dragMirror, setDragMirror] = useState<DragMirrorState | null>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  // ── State drag tâches ───────────────────────────────────────────────────────
  const [dragTask,    setDragTask]    = useState<Task | null>(null);
  const [dropTarget,  setDropTarget]  = useState<DropTarget | null>(null);
  /** Ref stable : accessible depuis les event listeners sans être une dépendance. */
  const dragTaskRef = useRef<Task | null>(null);

  // ── State drag colonnes ─────────────────────────────────────────────────────
  const [dragCol,     setDragCol]     = useState<ColumnWithTasks | null>(null);
  const [dragColOver, setDragColOver] = useState<number | null>(null);
  /** Ref stable vers la colonne en cours de drag. */
  const dragColRef = useRef<ColumnWithTasks | null>(null);
  /**
   * Colonne cible capturée dans `reorderColLive` AVANT le swap visuel.
   *
   * Après le réordonnancement de React, la colonne draguée occupe visuellement
   * la position de la cible — le `numero` de celle-ci devient inaccessible.
   * Ce ref conserve sa valeur originale pour le PATCH API final.
   */
  const colDropTargetRef = useRef<ColumnWithTasks | null>(null);

  // ── Snapshot et flags de drop ────────────────────────────────────────────────
  /** Copie des colonnes prise au début d'un drag — utilisée pour le rollback. */
  const columnsSnapshot = useRef<ColumnWithTasks[]>([]);
  /** `true` si un drop valide a eu lieu ; empêche le rollback dans `onDragEnd`. */
  const didDrop = useRef(false);

  // ── Ref vers les colonnes courantes ─────────────────────────────────────────
  // Permet de lire les colonnes fraîches dans les callbacks sans les inclure
  // dans leurs dépendances (évite les reconnexions WS et autres effets de bord).
  const columnsRef = useRef<ColumnWithTasks[]>(columns);
  useEffect(() => { columnsRef.current = columns; }, [columns]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  const scrollRafRef = useRef<number | null>(null);

  /**
   * Déclenche un scroll progressif dans un conteneur `.col-tasks` lorsque
   * le curseur approche du bord haut ou bas pendant un drag.
   *
   * Utilise `requestAnimationFrame` pour un scroll fluide (60 fps).
   * S'auto-annule dès que le curseur quitte la zone de déclenchement.
   *
   * @param el      - Conteneur cible (doit avoir `overflow: auto/scroll`).
   * @param clientY - Position Y courante du curseur (depuis l'event `dragover`).
   */
  const startColAutoScroll = useCallback((el: HTMLElement, clientY: number) => {
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);

    const ZONE = 64; // hauteur de la zone de déclenchement (px)
    const MAX  = 14; // vitesse maximale de scroll par frame (px)

    const step = () => {
      const rect       = el.getBoundingClientRect();
      const distTop    = clientY - rect.top;
      const distBottom = rect.bottom - clientY;

      if (distTop > 0 && distTop < ZONE) {
        // Zone supérieure : scroll vers le haut, vitesse ∝ proximité au bord
        el.scrollTop -= MAX * (1 - distTop / ZONE);
        scrollRafRef.current = requestAnimationFrame(step);
      } else if (distBottom > 0 && distBottom < ZONE) {
        // Zone inférieure : scroll vers le bas
        el.scrollTop += MAX * (1 - distBottom / ZONE);
        scrollRafRef.current = requestAnimationFrame(step);
      } else {
        scrollRafRef.current = null; // hors zone → on arrête
      }
    };

    scrollRafRef.current = requestAnimationFrame(step);
  }, []);

  /** Annule l'auto-scroll en cours (à appeler dans `onDragLeave` / `onDragEnd`). */
  const stopColAutoScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  // ── Canvas transparent (remplacement du ghost natif) ────────────────────────
  /**
   * Le navigateur génère un ghost semi-transparent pendant le drag.
   * On le remplace par notre `DragMirror` en passant ce canvas 1×1
   * à `e.dataTransfer.setDragImage(transparentPixel, 0, 0)`.
   */
  const transparentPixelRef = useRef<HTMLCanvasElement | null>(null);
  if (!transparentPixelRef.current) {
    const c = document.createElement("canvas");
    c.width = 1; c.height = 1;
    transparentPixelRef.current = c;
  }

  // ── Listener document pour le mirror ────────────────────────────────────────
  /**
   * Suit la position du curseur au niveau `document` (phase de capture)
   * pour déplacer le mirror sans être bloqué par les `stopPropagation` des enfants.
   * `dragover` se déclenche à chaque mouvement de souris pendant un drag.
   */
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (mirrorRef.current && dragMirror) {
        mirrorRef.current.style.left = `${e.clientX - dragMirror.ox}px`;
        mirrorRef.current.style.top  = `${e.clientY - dragMirror.oy}px`;
      }
    };
    const onDragEnd = () => setDragMirror(null);

    // Phase de capture : s'exécute avant tout `stopPropagation` des enfants
    document.addEventListener("dragover", onDragOver, true);
    document.addEventListener("dragend",  onDragEnd,  true);
    return () => {
      document.removeEventListener("dragover", onDragOver, true);
      document.removeEventListener("dragend",  onDragEnd,  true);
    };
  }, [dragMirror]);

  // ── Rollback ─────────────────────────────────────────────────────────────────
  const snapshotColumns = useCallback(() => {
    columnsSnapshot.current = columnsRef.current;
  }, []);

  const rollbackColumns = useCallback(() => {
    setColumns(columnsSnapshot.current);
  }, [setColumns]);

  // ── Helpers internes ─────────────────────────────────────────────────────────

  /**
   * Calcule l'index d'insertion dans la liste `tasksWithoutDragged`.
   *
   * @param tasksWithoutDragged - Tâches de la colonne cible sans la tâche draguée.
   * @param targetTaskId        - ID de la tâche devant laquelle insérer,
   *                             `undefined` pour une insertion en fin de liste.
   */
  const resolveTargetIndex = (
    tasksWithoutDragged: Task[],
    targetTaskId?: number,
  ): number => {
    if (targetTaskId == null) return tasksWithoutDragged.length;
    const idx = tasksWithoutDragged.findIndex(t => t.id === targetTaskId);
    return idx < 0 ? tasksWithoutDragged.length : idx;
  };

  /**
   * Renumérotation 0-based de la position après tout réordonnancement.
   * Garantit que `task.position` reflète toujours l'index réel dans le tableau.
   */
  const reindex = (tasks: Task[]): Task[] =>
    tasks.map((t, i) => ({ ...t, position: i }));

  // ── Drop de tâche ────────────────────────────────────────────────────────────

  /**
   * Finalise le déplacement d'une tâche après un drop valide.
   *
   * Algorithme :
   * 1. Retire la tâche draguée de la liste de sa colonne source.
   * 2. Calcule l'index d'insertion dans la colonne cible.
   * 3. Met à jour le state de façon optimiste depuis le snapshot.
   * 4. Appelle `PATCH /tasks/{id}/move` pour persister.
   * 5. Rollback sur le snapshot en cas d'erreur réseau.
   *
   * L'état part toujours du **snapshot** (pris au `dragStart`) et non du
   * state courant : évite des réordonnancements en cascade si plusieurs
   * `dragOver` ont déjà modifié l'affichage.
   *
   * @param targetColId  - ID de la colonne de destination.
   * @param task         - Tâche en cours de drag.
   * @param targetTaskId - ID de la tâche devant laquelle insérer (`undefined` = fin).
   */
  const handleDrop = useCallback((
    targetColId:   number,
    task:          Task,
    targetTaskId?: number,
  ) => {
    didDrop.current = true;
    setDragTask(null);

    const snap       = columnsSnapshot.current;
    const sameColumn = task.boardColumnId === targetColId;
    const targetCol  = snap.find(c => c.id === targetColId);
    if (!targetCol) return;

    // Liste de la colonne cible sans la tâche draguée (base du calcul d'index)
    const withoutDragged = sameColumn
      ? targetCol.tasks.filter(t => t.id !== task.id)
      : targetCol.tasks;

    const position = resolveTargetIndex(withoutDragged, targetTaskId);

    setColumns(snap.map(col => {
      // ── Même colonne ────────────────────────────────────────────────────────
      if (sameColumn && col.id === targetColId) {
        const reordered = col.tasks.filter(t => t.id !== task.id);
        reordered.splice(position, 0, { ...task, position });
        return { ...col, tasks: reindex(reordered) };
      }

      // ── Inter-colonnes ──────────────────────────────────────────────────────
      if (!sameColumn) {
        if (col.id === task.boardColumnId) {
          // Retire de la source
          return { ...col, tasks: col.tasks.filter(t => t.id !== task.id) };
        }
        if (col.id === targetColId) {
          // Insère dans la destination
          const inserted = [...col.tasks];
          inserted.splice(position, 0, { ...task, boardColumnId: targetColId, position });
          return { ...col, tasks: reindex(inserted) };
        }
      }

      return col;
    }));

    // Persistance — fire-and-forget avec rollback en cas d'erreur
    boardFetch(
      `${ROUTES_API.taskMove(task.id)}?newId=${targetColId}&position=${position}`,
      { method: "PATCH", body: "{}" },
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  }, [boardFetch, fetchBoard, setColumns]);

  // ── Drag & drop colonnes ─────────────────────────────────────────────────────

  /**
   * Réordonne les colonnes visuellement en temps réel pendant le drag de colonne.
   *
   * La colonne cible est capturée dans `colDropTargetRef` AVANT le swap de React :
   * après le réordonnancement, la colonne draguée se retrouve à la position de
   * la cible dans le DOM — son `numero` original serait alors inaccessible.
   * Le ref préserve cette valeur pour le PATCH final dans `handleColDrop`.
   *
   * @param targetCol - Colonne actuellement sous le curseur.
   */
  const reorderColLive = useCallback((targetCol: ColumnWithTasks) => {
    const col = dragColRef.current;
    if (!col || col.id === targetCol.id) return;

    // Sauvegarde le `numero` ORIGINAL avant tout swap
    colDropTargetRef.current = targetCol;

    setColumns(current => {
      const fromIdx = current.findIndex(c => c.id === col.id);
      const toIdx   = current.findIndex(c => c.id === targetCol.id);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return current;

      // Simple swap visuel — les `numero` restent inchangés jusqu'au PATCH
      const reordered = [...current];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered;
    });
  }, [setColumns]);

  /**
   * Finalise le déplacement d'une colonne après un drop valide.
   *
   * Utilise le `numero` capturé par `reorderColLive` (via `colDropTargetRef`)
   * plutôt que celui de `targetCol` passé en argument, car l'affichage a déjà
   * été swappé et le `numero` visible n'est plus fiable.
   *
   * L'UI étant déjà à jour, seul le PATCH API reste à effectuer.
   *
   * @param targetCol - Colonne sur laquelle on lâche (ignorée — cf. `colDropTargetRef`).
   */
  const handleColDrop = useCallback((_targetCol: ColumnWithTasks) => {
    // Capture immédiate : sur certains navigateurs `onDragEnd` se déclenche
    // avant `onDrop` et remet les refs à null.
    const col    = dragColRef.current;
    const target = colDropTargetRef.current; // numero original, pré-swap
    colDropTargetRef.current = null;

    if (!col || !target) { setDragCol(null); setDragColOver(null); return; }
    setDragCol(null);
    setDragColOver(null);

    boardFetch(
      `${ROUTES_API.columnMove(boardId, col.id)}?newNum=${target.numero}`,
      { method: "PATCH", body: "{}" },
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  }, [boardId, boardFetch, fetchBoard, setColumns]);

  // ── Déplacement par saisie de position ──────────────────────────────────────

  /**
   * Valide la saisie manuelle d'une position et déplace la tâche.
   *
   * L'utilisateur saisit un numéro **1-based** (position affichée) ;
   * l'index **0-based** est déduit et clampé entre 0 et `tasks.length - 1`.
   *
   * Utilise `columnsRef.current` (ref fraîche) plutôt que le closure sur
   * `columns` pour éviter les dépendances cycliques dans `useCallback`.
   *
   * @param task     - Tâche à déplacer.
   * @param col      - Colonne contenant la tâche.
   * @param rawValue - Valeur brute saisie (peut être vide ou invalide).
   */
  const commitPosition = useCallback((task: Task, col: ColumnWithTasks, rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    if (isNaN(parsed)) return;

    const maxPos = col.tasks.length - 1;
    const target = Math.max(0, Math.min(parsed - 1, maxPos)); // 1-based → 0-based + clamp
    if (target === task.position) return;

    columnsSnapshot.current = columnsRef.current;

    const reordered = col.tasks.filter(t => t.id !== task.id);
    reordered.splice(target, 0, task);

    setColumns(prev => prev.map(c =>
      c.id === col.id ? { ...c, tasks: reindex(reordered) } : c,
    ));

    boardFetch(
      `${ROUTES_API.taskMove(task.id)}?newId=${col.id}&position=${target}`,
      { method: "PATCH", body: "{}" },
    ).catch(() => { setColumns(columnsSnapshot.current); fetchBoard(); });
  }, [boardFetch, fetchBoard, setColumns]);

  // ─────────────────────────────────────────────────────────────────────────────
  return {
    dragTask,    dragCol,     dragColOver, dropTarget,  dragMirror,
    mirrorRef,   dragTaskRef, dragColRef,  columnsSnapshot, didDrop,
    transparentPixel: transparentPixelRef.current!,
    setDragTask, setDragCol,  setDragColOver, setDropTarget, setDragMirror,
    snapshotColumns, rollbackColumns,
    handleDrop,  handleColDrop, reorderColLive, commitPosition,
    startColAutoScroll, stopColAutoScroll,
  };
}
