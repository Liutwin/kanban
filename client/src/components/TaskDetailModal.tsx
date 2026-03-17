import React, { useState, useEffect, useRef } from "react";
import type { Task, Priority, User, Comment, Member, File as FileAttachment } from "../model/interfaces";
import { ROUTES_API } from "../config/api";
import { useAuth } from "../hooks/useAuth";
import { getAvatarStyle } from "../utils/avatarColor";
import Tooltip from "./Tooltip";
import UserAvatar from "./UserAvatar";

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
      <UserAvatar
        userId={user.id}
        firstName={user.firstName}
        lastName={user.lastName}
        hasAvatar={!!user.avatarURL}
        size={32}
        style={{ flexShrink: 0, boxShadow: `0 0 0 2px ${getAvatarStyle(user.id).from}44` }}
      />
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [error,      setError]      = useState("");
  const [validated,  setValidated]  = useState<boolean>(task.validated ?? false);
  const [validateHover, setValidateHover] = useState(false);
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

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  /* Pièces jointes */
  const [files,        setFiles]        = useState<FileAttachment[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [blobUrls,     setBlobUrls]     = useState<Record<string, string>>({});
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  // Libère les blob URLs à la fermeture pour éviter les fuites mémoire
  useEffect(() => {
    return () => { Object.values(blobUrls).forEach(URL.revokeObjectURL); };
  }, [blobUrls]);

  const loadBlobUrl = async (f: FileAttachment) => {
    if (blobUrls[String(f.id)]) return; // déjà chargé
    const res = await authFetch(ROUTES_API.file(String(f.id)) + "/download");
    if (!res.ok) return;
    const blob = await res.blob();
    setBlobUrls(prev => ({ ...prev, [String(f.id)]: URL.createObjectURL(blob) }));
  };

  useEffect(() => {
    setFilesLoading(true);
    authFetch(ROUTES_API.filesByTask(task.id))
      .then(r => r.ok ? r.json() : [])
      .then((data: FileAttachment[]) => {
        setFiles(data);
        // Pré-charge les blob URLs des images
        data.filter((f: FileAttachment) => f.type?.startsWith("image/")).forEach(loadBlobUrl);
      })
      .catch(() => {})
      .finally(() => setFilesLoading(false));
  }, [task.id]);

  const handleDownload = async (f: FileAttachment) => {
    const res = await authFetch(ROUTES_API.file(String(f.id)) + "/download");
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file",  picked);
      form.append("tskId", String(task.id));
      form.append("usrId", String(user!.id));
      const res = await authFetch(ROUTES_API.files, { method: "POST", body: form });
      if (!res.ok) return;
      const created: FileAttachment = await res.json();
      setFiles(prev => [...prev, created]);
      // Pré-charge le blob URL si c'est une image
      if (created.type?.startsWith("image/")) loadBlobUrl(created);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (id: string) => {
    const res = await authFetch(ROUTES_API.file(String(id)), { method: "DELETE" });
    if (res.ok) {
      setFiles(prev => prev.filter(f => String(f.id) !== id));
      setBlobUrls(prev => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

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

  /* Resynchronise tous les champs locaux quand la tâche affichée change.
     Sans ce effet, ouvrir une autre tâche sans démonter la modale laisse
     les states initialisés avec les valeurs de la première tâche — exactement
     le même bug que sur AdminToggle avec isAdmin. */
  useEffect(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    isClosing.current = false;
    setTitle(task.title);
    setDetails(task.details ?? "");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : "");
    setPriority(task.priority);
    setAssigneeId(task.assignedId ?? null);
    setValidated(task.validated ?? false);
    setSaveStatus("idle");
    setError("");
  }, [task.id]);

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
    t: string, det: string, dd: string, prio: Priority, val = validated
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
        validated:     val,
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
    setSaveStatus("pending");
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
    <>
      {/* Lightbox image plein écran */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxUrl}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#e8e0f0", width: 36, height: 36, borderRadius: 10, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>
      )}

    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
      onClick={handleClose}
    >
      <div
        style={{ background: "#2b2930", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(820px, 95vw)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.55)", animation: "slideUp 0.22s cubic-bezier(0.16,1,0.3,1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Bande priorité */}
        <div style={{ height: 4, background: priorityColor(priority), flexShrink: 0, opacity: 0.9, transition: "background 0.2s" }} />

        {/* En-tête */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px 0", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontFamily: "'DM Mono', monospace", color: "#7a7288" }}>
            <span style={{ color: "#b0a6ff", fontWeight: 500 }}>{columnName}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ opacity: 0.55 }}>#{task.id}</span>
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
                      <UserAvatar
                        userId={com.usrId}
                        firstName={author?.firstName ?? ""}
                        lastName={author?.lastName ?? ""}
                        hasAvatar={!!author?.avatarURL}
                        size={28}
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
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
                <UserAvatar
                  userId={user?.id ?? 0}
                  firstName={user?.firstName ?? ""}
                  lastName={user?.lastName ?? ""}
                  hasAvatar={!!user && !!members.find(m => m.id === user.id)?.avatarURL}
                  size={28}
                  style={{ flexShrink: 0 }}
                />
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

            {/* Pièces jointes */}
            <div>
              <Label>📎 Pièces jointes ({files.length})</Label>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {filesLoading && (
                  <span style={{ fontSize: 12, color: "#7a7288", fontStyle: "italic" }}>Chargement…</span>
                )}
                {!filesLoading && files.length === 0 && (
                  <span style={{ fontSize: 12, color: "#7a7288", fontStyle: "italic" }}>Aucune pièce jointe.</span>
                )}
                {files.map(f => {
                  const isImage = f.type?.startsWith("image/");
                  const blobUrl = blobUrls[String(f.id)];
                  return (
                    <div
                      key={String(f.id)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10, overflow: "hidden",
                      }}
                    >
                      {/* Aperçu image cliquable */}
                      {isImage && blobUrl && (
                        <img
                          src={blobUrl}
                          alt={f.name}
                          onClick={() => setLightboxUrl(blobUrl)}
                          style={{
                            width: "100%", maxHeight: 200,
                            objectFit: "contain", display: "block",
                            background: "rgba(0,0,0,0.2)",
                            cursor: "zoom-in",
                          }}
                        />
                      )}
                      {isImage && !blobUrl && (
                        <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7288", fontSize: 12, fontStyle: "italic" }}>
                          Chargement…
                        </div>
                      )}

                      {/* Barre nom + actions — overflow visible pour les tooltips */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", overflow: "visible" }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>
                          {isImage ? "🖼️"
                            : f.type === "application/pdf" ? "📄"
                            : f.type?.startsWith("text/") ? "📝"
                            : "📦"}
                        </span>
                        <span style={{
                          flex: 1, fontSize: 12, color: "#b8b0c8",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {f.name}
                        </span>
                        <Tooltip text="Télécharger" position="left">
                          <button
                            onClick={() => handleDownload(f)}
                            style={{ background: "none", border: "none", color: "#7a7288", cursor: "pointer", fontSize: 14, padding: "2px 5px", borderRadius: 5, flexShrink: 0 }}
                          >⬇</button>
                        </Tooltip>
                        {canEdit && (
                          <Tooltip text="Supprimer" position="left">
                            <button
                              onClick={() => handleDeleteFile(String(f.id))}
                              style={{ background: "none", border: "none", color: "#7a7288", cursor: "pointer", fontSize: 12, padding: "2px 5px", borderRadius: 5, flexShrink: 0 }}
                            >✕</button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8,
                      background: "rgba(176,166,255,0.08)",
                      border: "1px solid rgba(176,166,255,0.2)",
                      color: uploading ? "#7a7288" : "#b0a6ff",
                      fontSize: 12, fontWeight: 600,
                      cursor: uploading ? "not-allowed" : "pointer",
                      fontFamily: "inherit", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = "rgba(176,166,255,0.14)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(176,166,255,0.08)"; }}
                  >
                    {uploading ? "⏳ Upload en cours…" : "＋ Ajouter un fichier"}
                  </button>
                </>
              )}
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
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: priority === p ? badgeBg(p) : "transparent", border: "none", color: priority === p ? priorityColor(p) : "#b8b0c8", fontSize: 12, fontWeight: priority === p ? 600 : 400, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "background 0.12s, color 0.12s" }}
                        onMouseEnter={e => { if (priority !== p) { (e.currentTarget as HTMLButtonElement).style.background = badgeBg(p); (e.currentTarget as HTMLButtonElement).style.color = priorityColor(p); } }}
                        onMouseLeave={e => { if (priority !== p) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#b8b0c8"; } }}
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
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="date"
                  value={dueDate ? dueDate.slice(0, 10) : ""}
                  onChange={e => {
                    if (!canEdit) return;
                    const d = e.target.value;
                    const t = dueDate ? dueDate.slice(11, 16) : "12:00";
                    const val = d ? `${d}T${t}` : "";
                    setDueDate(val);
                    scheduleAutoSave(title, details, val);
                  }}
                  readOnly={!canEdit}
                  style={{ ...inputBase, fontSize: 12, fontFamily: "'DM Mono', monospace", color: overdue ? "#f28b82" : "#b8b0c8", flex: 1 }}
                  onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onBlur={e  => e.currentTarget.style.background = "transparent"}
                />
                <input
                  type="time"
                  value={dueDate ? dueDate.slice(11, 16) : ""}
                  onChange={e => {
                    if (!canEdit) return;
                    const t = e.target.value;
                    const d = dueDate ? dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
                    const val = t ? `${d}T${t}` : dueDate ? dueDate.slice(0, 10) + "T00:00" : "";
                    setDueDate(val);
                    scheduleAutoSave(title, details, val);
                  }}
                  readOnly={!canEdit}
                  style={{ ...inputBase, fontSize: 12, fontFamily: "'DM Mono', monospace", color: overdue ? "#f28b82" : "#b8b0c8", width: 80 }}
                  onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onBlur={e  => e.currentTarget.style.background = "transparent"}
                />
              </div>
              {dueDate && overdue && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999, background: "rgba(242,139,130,0.12)", border: "1px solid rgba(242,139,130,0.25)", color: "#f28b82", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4, display: "inline-block" }}>En retard</span>}
              {dueDate && canEdit && <button onClick={() => { setDueDate(""); scheduleAutoSave(title, details, ""); }} style={{ display: "block", marginTop: 3, fontSize: 11, color: "#7a7288", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "2px 8px" }}>× Effacer</button>}
            </div>

            {/* Valider la tâche */}
            {canEdit && (
              <div>
                <Label>✅ Validation</Label>
                <button
                  onClick={() => {
                    const next = !validated;
                    setValidated(next);
                    // Annule tout debounce en cours et sauvegarde immédiatement avec la nouvelle valeur
                    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
                    doSave(title, details, dueDate, priority, next);
                  }}
                  onMouseEnter={() => setValidateHover(true)}
                  onMouseLeave={() => setValidateHover(false)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "9px 12px",
                    background: validated
                      ? "rgba(129,201,149,0.12)"
                      : validateHover ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${validated ? "rgba(129,201,149,0.35)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.18s",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: validated ? "#81c995" : "#b8b0c8" }}>
                    {validated ? "Tâche validée" : "Valider la tâche"}
                  </span>
                  {/* Toggle pill */}
                  <div style={{
                    position: "relative", width: 36, height: 20, borderRadius: 999, flexShrink: 0,
                    background: validated ? "#81c995" : "rgba(255,255,255,0.15)",
                    transition: "background 0.22s",
                    boxShadow: validated ? "0 0 8px rgba(129,201,149,0.4)" : "none",
                  }}>
                    <div style={{
                      position: "absolute", top: 3, left: validated ? 18 : 3,
                      width: 14, height: 14, borderRadius: "50%",
                      background: validated ? "#1c1b1f" : "#e8e0f0",
                      transition: "left 0.22s, background 0.22s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                    }} />
                  </div>
                </button>
              </div>
            )}

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

                {/* Raccourci "M'assigner" / "Retirer" */}
                {canEdit && user?.id != null && (
                  assigneeId === user.id ? (
                    <button
                      onClick={() => handleAssigneeChange(null)}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(242,139,130,0.12)"; e.currentTarget.style.borderColor = "rgba(242,139,130,0.35)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 6, padding: "7px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#f28b82", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", letterSpacing: "0.01em" }}
                    >
                      × Retirer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssigneeChange(user.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(176,166,255,0.12)"; e.currentTarget.style.borderColor = "rgba(176,166,255,0.35)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 6, padding: "7px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#b0a6ff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", letterSpacing: "0.01em" }}
                    >
                      🙋 M'assigner
                    </button>
                  )
                )}

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
                        onMouseEnter={e => { e.currentTarget.style.background = assigneeId === m.id ? "rgba(176,166,255,0.14)" : "rgba(255,255,255,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = assigneeId === m.id ? "rgba(176,166,255,0.08)" : "transparent"; }}
                        style={{ padding: "6px 8px", cursor: "pointer", background: assigneeId === m.id ? "rgba(176,166,255,0.08)" : "transparent", transition: "background 0.15s" }}
                      >
                        <UserCard user={m} accent="#b0a6ff" selected={assigneeId === m.id} onClick={() => {}} />
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
                    {saveStatus === "pending" && <span style={{ opacity: 0.35 }}>En attente…</span>}
                    {saveStatus === "saving" && <><span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Sauvegarde…</>}
                    {saveStatus === "saved"  && <>✓ Sauvegardé</>}
                    {saveStatus === "error"  && <>⚠ Erreur</>}
                    {saveStatus === "idle"   && <span style={{ opacity: 0.3 }}>Auto-sauvegarde</span>}
                  </div>
                  <Tooltip text="Supprimer la tâche" position="top">
                    <button
                      onClick={() => onDelete(task.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(242,139,130,0.2)"; e.currentTarget.style.borderColor = "rgba(242,139,130,0.5)"; e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(242,139,130,0.08)"; e.currentTarget.style.borderColor = "rgba(242,139,130,0.25)"; e.currentTarget.style.transform = "scale(1)"; }}
                      style={{ width: "100%", padding: "11px 16px", borderRadius: 12, background: "rgba(242,139,130,0.08)", border: "1px solid rgba(242,139,130,0.25)", color: "#f28b82", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s", letterSpacing: "0.02em", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                    >
                      <span style={{ fontSize: 15 }}>🗑</span> Supprimer la tâche
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}