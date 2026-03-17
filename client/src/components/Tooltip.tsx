import React, { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

/**
 * Props du composant {@link Tooltip}.
 */
interface TooltipProps {
  /** Texte affiché dans la bulle. */
  text: string;
  /** Élément déclencheur — doit être un unique nœud React. */
  children: React.ReactElement;
  /**
   * Position souhaitée de la bulle par rapport au déclencheur.
   * Si omise, la position est choisie automatiquement selon l'espace disponible
   * (préférence pour `"top"`, bascule en `"bottom"` si l'espace est insuffisant).
   */
  position?: "top" | "bottom" | "left" | "right";
}

const OFFSET = 10;

/**
 * Coordonnées absolues (en pixels, relatives au document) de la bulle du tooltip,
 * calculées à partir du {@link DOMRect} du déclencheur.
 */
interface BubblePos {
  /** Distance depuis le haut du document. */
  top:       number;
  /** Distance depuis le bord gauche du document. */
  left:      number;
  /** Transformation CSS permettant de centrer la bulle par rapport au point d'ancrage. */
  transform: string;
}

/**
 * Calcule les coordonnées absolues de la bulle du tooltip dans le document.
 *
 * Les valeurs tiennent compte du défilement de la page (`window.scrollY/X`)
 * afin que le portal rendu dans `document.body` soit positionné correctement
 * même sur des pages scrollables.
 *
 * @param rect - Bounding rect du déclencheur, obtenu via `getBoundingClientRect()`.
 * @param pos  - Côté sur lequel la bulle doit apparaître.
 * @returns    Coordonnées et transformation CSS prêtes à l'emploi.
 */
function computePosition(
  rect: DOMRect,
  pos: "top" | "bottom" | "left" | "right",
): BubblePos {
  switch (pos) {
    case "top":
      return {
        top:       rect.top  + window.scrollY - OFFSET,
        left:      rect.left + window.scrollX + rect.width  / 2,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        top:       rect.bottom + window.scrollY + OFFSET,
        left:      rect.left   + window.scrollX + rect.width / 2,
        transform: "translate(-50%, 0)",
      };
    case "left":
      return {
        top:       rect.top  + window.scrollY + rect.height / 2,
        left:      rect.left + window.scrollX - OFFSET,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        top:       rect.top   + window.scrollY + rect.height / 2,
        left:      rect.right + window.scrollX + OFFSET,
        transform: "translate(0, -50%)",
      };
  }
}

/**
 * Bulle d'aide contextuelle affichée au survol d'un élément.
 *
 * La bulle est rendue via `ReactDOM.createPortal` directement dans `document.body`,
 * ce qui lui permet d'échapper à tout parent avec `overflow: hidden` ou `clip`
 * (typiquement les cartes ou panneaux scrollables).
 *
 * Sa position est calculée à partir du `getBoundingClientRect()` du déclencheur
 * au moment du survol, et peut être forcée via la prop `position` ou laissée en
 * auto-détection (haut/bas selon l'espace disponible à l'écran).
 *
 * @example
 * ```tsx
 * <Tooltip text="Supprimer le tableau" position="top">
 *   <button onClick={handleDelete}>✕</button>
 * </Tooltip>
 * ```
 *
 * @param props - {@link TooltipProps}
 */
export default function Tooltip({ text, children, position }: TooltipProps) {
  const [visible,  setVisible]  = useState(false);
  const [bubblePos, setBubblePos] = useState<BubblePos | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();

    // Résolution automatique de la position si non forcée
    let resolved: "top" | "bottom" | "left" | "right" = position ?? "top";
    if (!position) {
      resolved = rect.top < 60 || (window.innerHeight - rect.bottom) > rect.top
        ? "bottom"
        : "top";
    }

    setBubblePos(computePosition(rect, resolved));
    setVisible(true);
  }, [position]);

  const handleMouseLeave = useCallback(() => setVisible(false), []);

  const portal = visible && bubblePos
    ? ReactDOM.createPortal(
        <span
          style={{
            position:   "absolute",
            top:        bubblePos.top,
            left:       bubblePos.left,
            transform:  bubblePos.transform,
            whiteSpace: "nowrap",
            background: "#1c1b1f",
            color:      "#e8e0f0",
            fontSize:   11,
            fontWeight: 500,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            letterSpacing: "0.02em",
            padding:    "5px 10px",
            borderRadius: 7,
            border:     "1px solid rgba(176,166,255,0.2)",
            boxShadow:  "0 4px 16px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(176,166,255,0.1)",
            pointerEvents: "none",
            zIndex:     9999,
            opacity:    1,
            transition: "opacity 0.15s ease",
          }}
        >
          {text}
        </span>,
        document.body,
      )
    : null;

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "fit-content" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {portal}
    </span>
  );
}