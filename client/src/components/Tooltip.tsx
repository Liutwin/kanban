import React, { useState, useRef } from "react";

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

const OFFSET = 10;
const ARROW  = 7;

function getStyles(position: string, visible: boolean): {
  bubble: React.CSSProperties;
  arrow:  React.CSSProperties;
} {
  const base: React.CSSProperties = {
    position: "absolute",
    whiteSpace: "nowrap",
    background: "#1c1b1f",
    color: "#e8e0f0",
    fontSize: 11,
    fontWeight: 500,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    letterSpacing: "0.02em",
    padding: "5px 10px",
    borderRadius: 7,
    border: "1px solid rgba(176,166,255,0.2)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(176,166,255,0.1)",
    pointerEvents: "none",
    zIndex: 9999,
    transition: "opacity 0.15s ease, transform 0.15s ease",
  };

  const arrowBase: React.CSSProperties = {
    position: "absolute",
    width: 6,
    height: 6,
    background: "#1c1b1f",
    border: "1px solid rgba(176,166,255,0.2)",
    pointerEvents: "none",
    zIndex: 9998,
    transition: "opacity 0.15s ease",
  };

  const show = { opacity: 1 };
  const hide = { opacity: 0 };

  if (position === "top") return {
    bubble: { ...base, bottom: `calc(100% + ${OFFSET}px)`, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 4}px) scale(${visible ? 1 : 0.95})`,
      ...(visible ? show : hide) },
    arrow:  { ...arrowBase, bottom: `calc(100% + ${ARROW}px)`, left: "50%",
      transform: "translateX(-50%) rotate(45deg)",
      borderTop: "none", borderLeft: "none",
      ...(visible ? show : hide) },
  };
  if (position === "bottom") return {
    bubble: { ...base, top: `calc(100% + ${OFFSET}px)`, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : -4}px) scale(${visible ? 1 : 0.95})`,
      ...(visible ? show : hide) },
    arrow:  { ...arrowBase, top: `calc(100% + ${ARROW}px)`, left: "50%",
      transform: "translateX(-50%) rotate(45deg)",
      borderBottom: "none", borderRight: "none",
      ...(visible ? show : hide) },
  };
  if (position === "left") return {
    bubble: { ...base, right: `calc(100% + ${OFFSET}px)`, top: "50%",
      transform: `translateY(-50%) translateX(${visible ? 0 : 4}px) scale(${visible ? 1 : 0.95})`,
      ...(visible ? show : hide) },
    arrow:  { ...arrowBase, right: `calc(100% + ${ARROW}px)`, top: "50%",
      transform: "translateY(-50%) rotate(45deg)",
      borderLeft: "none", borderBottom: "none",
      ...(visible ? show : hide) },
  };
  return {
    bubble: { ...base, left: `calc(100% + ${OFFSET}px)`, top: "50%",
      transform: `translateY(-50%) translateX(${visible ? 0 : -4}px) scale(${visible ? 1 : 0.95})`,
      ...(visible ? show : hide) },
    arrow:  { ...arrowBase, left: `calc(100% + ${ARROW}px)`, top: "50%",
      transform: "translateY(-50%) rotate(45deg)",
      borderRight: "none", borderTop: "none",
      ...(visible ? show : hide) },
  };
}

export default function Tooltip({ text, children, position }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [resolvedPos, setResolvedPos] = useState<"top" | "bottom" | "left" | "right">(position ?? "top");
  const wrapRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    // Auto-détection : si pas de position forcée, choisir selon l'espace disponible
    if (!position && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const spaceTop    = rect.top;
      const spaceBottom = window.innerHeight - rect.bottom;
      setResolvedPos(spaceTop < 60 || spaceBottom > spaceTop ? "bottom" : "top");
    } else if (position) {
      setResolvedPos(position);
    }
    setVisible(true);
  };

  const { bubble, arrow } = getStyles(resolvedPos, visible);

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span style={bubble}>{text}</span>
      <span style={arrow} />
    </span>
  );
}