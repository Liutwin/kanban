import React, { useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

const OFFSET = 10;

interface BubblePos {
  top:       number;
  left:      number;
  transform: string;
}

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