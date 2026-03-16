import React, { useState, useEffect, useRef } from "react";
import type { Task, Priority, User, Comment, Member } from "../model/interfaces";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getAvatarStyle } from "../utils/avatarColor";
import Tooltip from "./Tooltip";

interface Props {
  task:       Task;
  columnName: string;
  members?:   User[];
  onClose:    () => void;
  onEdit:       (task: Task) => void;
  onDelete:     (taskId: number) => void;
  currentRole?: Member["role"];
}

/* ── Helpers ── */
const PRIORITIES: Priority[] = ["basse", "moyenne", "haute"];
const priorityLabel = (p: Priority) => p === "haute" ? "↑ Haute" : p === "moyenne" ? "→ Moyenne" : "↓ Basse";
const priorityColor = (p: Priority) => p === "haute" ? "#f28b82" : p === "moyenne" ? "#fdd663" : "#81c995";
const badgeBg     = (p: Priority) => p === "haute" ? "rgba(242,139,130,0.15)" : p === "moyenne" ? "rgba(253,214,99,0.12)" : "rgba(129,201,149,0.1)";
const badgeBorder = (p: Priority) => p === "haute" ? "rgba(242,139,130,0.3)"  : p === "moyenne" ? "rgba(253,214,99,0.3)"  : "rgba(129,201,149,0.25)";
const isOverdue   = (dt?: string | null) => dt ? new Date(dt) < new Date() : false;
const formatDate  = (dt?: string | null) => dt
  ? new Date(dt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : null;
const initials    = (u: User) => `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();

/* ── Carte utilisateur ── */
function UserCard({ user, accent = "#b0a6ff", onClick, selected }: { user: User; accent?: string; onClick?: (e: React.MouseEvent) => void; selected?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: selected ? `${accent}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${selected ? accent + "55" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10, padding: "8px 11px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: getAvatarStyle(user.id).background, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${getAvatarStyle(user.id).from}44` }}>
        {user.avatarURL
          ? <img src={user.avatarURL} alt={initials(user)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 11, fontWeight: 700, color: "#1c1b1f" }}>{initials(user)}</span>
        }
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e0f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.firstName} {user.lastName}</span>
        <span style={{ fontSize: 11, color: "#7a7288", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
      </div>
    </div>
  );
}

/* ── Label de section ── */
function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7a7288", display: "block", marginBottom: 6 }}>{children}</span>;
}

/* ── Composant principal ── */
export default function TaskDetailModal({ task, columnName, members = [], onClose, onEdit, onDelete, currentRole = "editeur" }: Props) {
  const { authFetch, user } = useAuth();

  // Lecteur → lecture seule partout
  const canEdit = currentRole !== "lecteur";

  /* Formulaire */
  const [title,      setTitle]      = useState(task.title);
  const [details,    setDetails]    = useState(task.details ?? "");
  const [dueDate,    setDueDate]    = useState(task.dueDate ? task.dueDate.slice(0, 16) : "");
  const [priority,   setPriority]   = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<number | null>(task.assignedId ?? null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error,      setError]      = useState("");
  const debounceRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosing          = useRef(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = () => {
    isClosing.current = true;
    // Si une sauvegarde est en attente (debounce), la déclencher immédiatement
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      doSave(title, details, dueDate, priority);
    }
    onClose();
  };

  /* UI state */
  const [priorityOpen,  setPriorityOpen]  = useState(false);
  const [assigneeOpen,  setAssigneeOpen]  = useState(false);

  /* Commentaires */
  const [comments,      setComments]      = useState<Comment[]>([]);
  const [commentText,   setCommentText]   = useState("");
  const [editingCom,    setEditingCom]    = useState<{ id: number; text: string } | null>(null);
  const [comLoading,    setComLoading]    = useState(false);
  const [comSending,    setComSending]    = useState(false);

  // Charger les commentaires à l'ouverture
  useEffect(() => {
    setComLoading(true);
    authFetch(ROUTES_API.commentsByTask(task.id))
      .then(r => r.ok ? r.json() : [])
      .then((data: Comment[]) => setComments(data))
      .catch(() => {})
      .finally(() => setComLoading(false));
  }, [task.id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setComSending(true);
    try {
      const res = await authFetch(ROUTES_API.comments, {
        method: "POST",
        body: JSON.stringify({ content: commentText.trim(), tskId: task.id, usrId: user!.id }),
      });
      if (!res.ok) return;
      const created: Comment = await res.json();
      setComments(prev => [...prev, created]);
      setCommentText("");
    } finally {
      setComSending(false);
    }
  };

  const handleUpdateComment = async (id: number, content: string) => {
    if (!content.trim()) return;
    const res = await authFetch(ROUTES_API.comment(id), {
      method: "PUT",
      body: JSON.stringify({ content: content.trim(), tskId: task.id, usrId: user!.id }),
    });
    if (!res.ok) return;
    const updated: Comment = await res.json();
    setComments(prev => prev.map(c => c.id === id ? updated : c));
    setEditingCom(null);
  };

  const handleDeleteComment = async (id: number) => {
    const res = await authFetch(ROUTES_API.comment(id), { method: "DELETE" });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== id));
  };

  /* Résolution créateur */
  const creatorFromMembers = members.find(m => m.id === task.creatorId) ?? null;
  const [fetchedCreator, setFetchedCreator] = useState<User | null>(null);
  useEffect(() => {
    if (creatorFromMembers) { setFetchedCreator(null); return; }
    authFetch(ROUTES_API.user(task.creatorId))
      .then(r => r.ok ? r.json() : null)
      .then((u: User | null) => setFetchedCreator(u))
      .catch(() => {});
  }, [task.creatorId]);
  const creator  = creatorFromMembers ?? fetchedCreator;
  const assignee = assigneeId != null ? members.find(m => m.id === assigneeId) ?? null : null;
  const overdue  = isOverdue(dueDate || null);

  /* Auto-resize textarea */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [details]);

  /* Auto-resize textarea commentaire */
  useEffect(() => {
    if (commentTextareaRef.current) {
      commentTextareaRef.current.style.height = "auto";
      commentTextareaRef.current.style.height = `${commentTextareaRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  /* Fermer les dropdowns si clic à l'extérieur */
  useEffect(() => {
    const close = () => { setPriorityOpen(false); setAssigneeOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* Échap pour fermer la modale */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* État hover pour le bouton fermer */
  const [closeHover, setCloseHover] = useState(false);

  /* Sauvegarde automatique avec debounce */
  const doSave = async (
    t: string, det: string, dd: string, prio: Priority
  ) => {
    if (!t.trim()) { setError("Le titre ne peut pas être vide."); return; }
    setError("");
    setSaveStatus("saving");
    try {
      const body = {
        title:         t.trim(),
        details:       det || null,
        dueDate:       dd ? new Date(dd).toISOString() : null,
        priority:      prio,
        boardColumnId: task.boardColumnId,
        creatorId:     task.creatorId,
      };
      const res = await authFetch(ROUTES_API.task(task.id), { method: "PUT", body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde.");
      const saved: Task = await res.json();
      if (!isClosing.current) {
        setSaveStatus("saved");
        onEdit(saved);
      }
    } catch (e: unknown) {
      if (isClosing.current) return;
      setSaveStatus("error");
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const scheduleAutoSave = (
    t = title, det = details, dd = dueDate, prio = priority
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("saving");
    debounceRef.current = setTimeout(() => doSave(t, det, dd, prio), 800);
  };

  /* Assignation via l'endpoint dédié PATCH /tasks/{id}/assign */
  const handleAssigneeChange = async (newId: number | null) => {
    setAssigneeId(newId);
    setAssigneeOpen(false);
    setSaveStatus("saving");
    try {
      const url = newId != null
        ? `${ROUTES_API.taskAssign(task.id)}?userId=${newId}`
        : ROUTES_API.taskAssign(task.id);
      const res = await authFetch(url, { method: "PATCH", body: "{}" });
      if (!res.ok) throw new Error("Erreur lors de l'assignation.");
      const saved: Task = await res.json();
      if (!isClosing.current) {
        setSaveStatus("saved");
        onEdit(saved);
      }
    } catch (e: unknown) {
      if (isClosing.current) return;
      setSaveStatus("error");
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  /* Styles de base pour les champs éditables */
  const inputBase: React.CSSProperties = {
    background: "transparent", border: "none", outline: "none",
    color: "#e8e0f0", fontFamily: "inherit", width: "100%",
    borderRadius: 8, padding: "5px 8px", transition: "background 0.15s",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={handleClose}
    >
      <div
        style={{ background: "#2b2930", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(720px, 95vw)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.55)", animation: "slideUp 0.22s cubic-bezier(0.16,1,0.3,1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Bande priorité */}
        <div style={{ height: 4, background: priorityColor(priority), flexShrink: 0, opacity: 0.9, transition: "background 0.2s" }} />

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px 0", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#7a7288" }}>
            <span style={{ color: "#b0a6ff", fontWeight: 500 }}>{columnName}</span>
            <span style={{ opacity: 0.4 }}>›</span>
            <span>#{task.id}</span>
          </div>
          <Tooltip text="Fermer" position="bottom">
            <button
              onClick={handleClose}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              style={{ background: closeHover ? "rgba(242,139,130,0.12)" : "none", border: `1px solid ${closeHover ? "rgba(242,139,130,0.25)" : "transparent"}`, color: closeHover ? "#f28b82" : "#7a7288", cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 14, transition: "all 0.15s" }}
            >✕</button>
          </Tooltip>
        </div>

        {/* Titre éditable */}
        <div style={{ padding: "10px 22px 0", flexShrink: 0 }}>
          <input
            value={title}
            onChange={e => { if (!canEdit) return; setTitle(e.target.value); scheduleAutoSave(e.target.value); }}
            maxLength={50}
            placeholder="Titre de la tâche…"
            readOnly={!canEdit}
            style={{ ...inputBase, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, padding: "6px 8px", borderRadius: 10, cursor: canEdit ? "text" : "default" }}
            onFocus={e => { if (canEdit) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onBlur={e  => e.currentTarget.style.background = "transparent"}
          />
          {error && <p style={{ fontSize: 12, color: "#f28b82", margin: "4px 8px 0" }}>{error}</p>}
        </div>

        {/* Corps deux colonnes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", overflowY: "auto", flex: 1, minHeight: 0, padding: "16px 0 0" }}>

          {/* Colonne principale */}
          <div style={{ padding: "0 20px 24px 22px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Description */}
            <div>
              <Label>📋 Description</Label>
              <textarea
                ref={textareaRef}
                value={details}
                onChange={e => { if (!canEdit) return; setDetails(e.target.value); scheduleAutoSave(title, e.target.value); }}
                readOnly={!canEdit}
                placeholder={canEdit ? "Ajouter une description…" : ""}
                rows={3}
                style={{ ...inputBase, fontSize: 13.5, lineHeight: 1.65, resize: "none", overflow: "hidden", minHeight: 72, display: "block", cursor: canEdit ? "text" : "default" }}
                onFocus={e => { if (canEdit) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onBlur={e  => e.currentTarget.style.background = "transparent"}
              />
            </div>

            {/* Commentaires */}
            <div>
              <Label>💬 Commentaires ({comments.length})</Label>

              {/* Liste */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {comLoading && <span style={{ fontSize: 12, color: "#7a7288", fontStyle: "italic" }}>Chargement…</span>}
                {!comLoading && comments.length === 0 && (
                  <span style={{ fontSize: 12, color: "#7a7288", fontStyle: "italic" }}>Aucun commentaire.</span>
                )}
                {comments.map(com => {
                  const author = members.find(m => m.id === com.usrId);
                  const isOwn  = user?.id === com.usrId;
                  const isEditing = editingCom?.id === com.id;
                  return (
                    <div key={com.id} style={{ display: "flex", gap: 10 }}>
                      {/* Avatar */}
                      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #b0a6ff88, #b0a6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#1c1b1f", overflow: "hidden", marginTop: 2 }}>
                        {author?.avatarURL
                          ? <img src={author.avatarURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span>{author ? initials(author) : "?"}</span>
                        }
                      </div>
                      {/* Bulle */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e0f0" }}>
                            {author ? `${author.firstName} ${author.lastName}` : `#${com.usrId}`}
                          </span>
                          <span style={{ fontSize: 11, color: "#7a7288", fontFamily: "'DM Mono', monospace" }}>
                            {new Date(com.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <textarea
                              autoFocus
                              value={editingCom.text}
                              onChange={e => setEditingCom({ ...editingCom, text: e.target.value })}
                              rows={2}
                              style={{ ...inputBase, fontSize: 13, lineHeight: 1.55, resize: "none", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 8px", border: "1px solid rgba(255,255,255,0.1)" }}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => handleUpdateComment(com.id, editingCom.text)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: "rgba(176,166,255,0.18)", color: "#b0a6ff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Enregistrer</button>
                              <button onClick={() => setEditingCom(null)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "#7a7288", cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <p style={{ fontSize: 13, color: "#b8b0c8", lineHeight: 1.55, margin: 0, flex: 1, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{com.content}</p>
                            {isOwn && canEdit && (
                              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                <Tooltip text="Modifier" position="top">
                                  <button onClick={() => setEditingCom({ id: com.id, text: com.content })} style={{ background: "none", border: "none", color: "#7a7288", cursor: "pointer", fontSize: 12, padding: "2px 5px", borderRadius: 5 }}>✎</button>
                                </Tooltip>
                                <Tooltip text="Supprimer" position="top">
                                  <button onClick={() => handleDeleteComment(com.id)} style={{ background: "none", border: "none", color: "#7a7288", cursor: "pointer", fontSize: 12, padding: "2px 5px", borderRadius: 5 }}>✕</button>
                                </Tooltip>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Saisie nouveau commentaire — masquée pour les lecteurs */}
              {canEdit && <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #64d2c888, #64d2c8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#1c1b1f", overflow: "hidden" }}>
                  {user && members.find(m => m.id === user.id)?.avatarURL
                    ? <img src={members.find(m => m.id === user.id)!.avatarURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>{user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : "?"}</span>
                  }
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    ref={commentTextareaRef}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Ajouter un commentaire… (saut de ligne : Shift+Entrée)"
                    rows={1}
                    style={{ ...inputBase, fontSize: 13, lineHeight: 1.55, resize: "none", overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 70px 8px 10px", display: "block", transition: "border-color 0.15s" }}
                    onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(176,166,255,0.3)"; }}
                    onBlur={e  => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={comSending || !commentText.trim()}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", padding: "4px 10px", borderRadius: 7, border: "none", background: commentText.trim() ? "rgba(176,166,255,0.2)" : "transparent", color: commentText.trim() ? "#b0a6ff" : "#4a4460", fontSize: 11, fontWeight: 600, cursor: commentText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.15s" }}
                  >
                    {comSending ? "…" : "Envoyer"}
                  </button>
                </div>
              </div>}
            </div>

          </div>

          {/* Sidebar */}
          <div style={{ padding: "0 18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Priorité — badge cliquable + dropdown */}
            <div>
              <Label>🎯 Priorité</Label>
              <div style={{ position: "relative" }} onMouseDown={e => e.stopPropagation()}>
                {/* Badge actuel */}
                <button
                  onClick={() => { if (!canEdit) return; setPriorityOpen(o => !o); setAssigneeOpen(false); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: badgeBg(priority), border: `1px solid ${badgeBorder(priority)}`, borderRadius: 999, padding: "4px 12px", color: priorityColor(priority), fontSize: 11, fontWeight: 600, cursor: canEdit ? "pointer" : "default", fontFamily: "inherit" }}
                >
                  {priorityLabel(priority)}
                  {canEdit && <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>}
                </button>

                {/* Dropdown */}
                {priorityOpen && canEdit && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#322f38", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 10, minWidth: 130 }}>
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPriority(p); setPriorityOpen(false); scheduleAutoSave(title, details, dueDate, p); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: priority === p ? badgeBg(p) : "transparent", border: "none", color: priority === p ? priorityColor(p) : "#b8b0c8", fontSize: 12, fontWeight: priority === p ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor(p), flexShrink: 0 }} />
                        {priorityLabel(p)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date limite */}
            <div>
              <Label>⏰ Date limite</Label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => {
                  if (!canEdit) return;
                  let val = e.target.value;
                  if (val && val.length === 10) {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, "0");
                    const mm = String(now.getMinutes()).padStart(2, "0");
                    val = `${val}T${hh}:${mm}`;
                  }
                  setDueDate(val);
                  scheduleAutoSave(title, details, val);
                }}
                readOnly={!canEdit}
                style={{ ...inputBase, fontSize: 12, fontFamily: "'DM Mono', monospace", color: overdue ? "#f28b82" : "#b8b0c8" }}
                onFocus={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  if (canEdit && !dueDate) {
                    const now = new Date();
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    setDueDate(local);
                  }
                }}
                onBlur={e  => e.currentTarget.style.background = "transparent"}
              />
              {dueDate && overdue && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "rgba(242,139,130,0.12)", border: "1px solid rgba(242,139,130,0.25)", color: "#f28b82", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4, display: "inline-block" }}>En retard</span>}
              {dueDate && canEdit && <button onClick={() => { setDueDate(""); scheduleAutoSave(title, details, ""); }} style={{ display: "block", marginTop: 3, fontSize: 11, color: "#7a7288", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px" }}>× Effacer</button>}
            </div>

            {/* Créateur (lecture seule) */}
            <div>
              <Label>✏️ Créé par</Label>
              {creator
                ? <UserCard user={creator} accent="#64d2c8" />
                : <span style={{ fontSize: 12, color: "#7a7288", fontStyle: "italic" }}>#{task.creatorId}</span>
              }
            </div>

            {/* Assigné — carte cliquable + dropdown */}
            <div>
              <Label>👤 Assigné à</Label>
              <div style={{ position: "relative" }} onMouseDown={e => e.stopPropagation()}>
                {/* Affichage actuel */}
                <div
                  onClick={() => { if (!canEdit) return; setAssigneeOpen(o => !o); setPriorityOpen(false); }}
                  style={{ cursor: canEdit ? "pointer" : "default" }}
                >
                  {assignee
                    ? <UserCard user={assignee} accent="#b0a6ff" selected onClick={canEdit ? (e: React.MouseEvent) => { e.stopPropagation(); setAssigneeOpen(o => !o); setPriorityOpen(false); } : undefined} />
                    : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 11px", color: "#7a7288", fontSize: 12, fontStyle: "italic" }}>
                        <span style={{ fontSize: 16 }}>+</span> Assigner à…
                      </div>
                    )
                  }
                </div>

                {/* Dropdown membres */}
                {assigneeOpen && canEdit && members.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#322f38", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 10, maxHeight: 220, overflowY: "auto" }}>
                    {/* Option "Désassigner" */}
                    {assigneeId != null && (
                      <button
                        onClick={() => handleAssigneeChange(null)}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#f28b82", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        × Retirer l'assignation
                      </button>
                    )}
                    {members.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleAssigneeChange(m.id)}
                        style={{ padding: "6px 8px", cursor: "pointer", background: assigneeId === m.id ? "rgba(176,166,255,0.08)" : "transparent", transition: "background 0.1s" }}
                      >
                        <UserCard user={m} accent="#b0a6ff" selected={assigneeId === m.id} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!canEdit && (
                <div style={{ textAlign: "center", fontSize: 11, color: "#7a7288", fontStyle: "italic", padding: "6px 0", letterSpacing: "0.05em" }}>👁 Lecture seule</div>
              )}
              {canEdit && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "8px 0", fontSize: 12, fontFamily: "'DM Mono', monospace", color: saveStatus === "error" ? "#f28b82" : saveStatus === "saving" ? "#7a7288" : saveStatus === "saved" ? "#81c995" : "#7a7288", transition: "color 0.3s" }}>
                    {saveStatus === "saving" && <><span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Sauvegarde…</>}
                    {saveStatus === "saved"  && <>✓ Sauvegardé</>}
                    {saveStatus === "error"  && <>⚠ Erreur</>}
                    {saveStatus === "idle"   && <span style={{ opacity: 0.3 }}>Auto-sauvegarde</span>}
                  </div>
                  <Tooltip text="Supprimer la tâche" position="top">
                    <button
                      onClick={() => onDelete(task.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(242,139,130,0.15)"; e.currentTarget.style.borderColor = "rgba(242,139,130,0.35)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(242,139,130,0.08)"; e.currentTarget.style.borderColor = "rgba(242,139,130,0.2)"; }}
                      style={{ width: "100%", padding: "9px 0", borderRadius: 10, background: "rgba(242,139,130,0.08)", border: "1px solid rgba(242,139,130,0.2)", color: "#f28b82", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                    >
                      ✕ Supprimer
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}