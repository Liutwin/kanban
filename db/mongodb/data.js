// ============================================================
// mongo_donnees.js – Jeu de données fictif MongoDB
// Projet Kanban SI-SOR 2026
// À exécuter via : mongosh < mongo_donnees.js
// ============================================================

use("e22408439_kanban");

// ============================================================
// commentaire_com
// Références tsk_id et usr_id cohérentes avec bdd_donnees.sql
// ============================================================
db.commentaire_com.insertMany([
  // Tâche 1 – Audit SEO (tab 1)
  {
    com_contenu: "J'ai commencé l'analyse des balises meta, plusieurs pages sont mal renseignées.",
    com_date: new Date("2026-03-05T10:00:00Z"),
    tsk_id: Long(1),
    usr_id: Long(3)   // Claire (assignée)
  },
  {
    com_contenu: "Rapport Screaming Frog généré, je le partage en pièce jointe.",
    com_date: new Date("2026-03-06T14:30:00Z"),
    tsk_id: Long(1),
    usr_id: Long(1)   // Alice (créatrice)
  },

  // Tâche 3 – Intégration page accueil (tab 1)
  {
    com_contenu: "La section hero est intégrée, il reste le footer et la navigation.",
    com_date: new Date("2026-03-10T09:15:00Z"),
    tsk_id: Long(3),
    usr_id: Long(2)   // Bob (assigné)
  },

  // Tâche 12 – Écran de connexion (tab 2)
  {
    com_contenu: "Le formulaire est fonctionnel, le JWT est bien stocké dans le SecureStore.",
    com_date: new Date("2026-03-09T11:30:00Z"),
    tsk_id: Long(12),
    usr_id: Long(4)   // David (assigné)
  },
  {
    com_contenu: "Penser à gérer l'expiration du token côté client.",
    com_date: new Date("2026-03-09T15:00:00Z"),
    tsk_id: Long(12),
    usr_id: Long(1)   // Alice (créatrice)
  },

  // Tâche 14 – Écran liste des tâches (tab 2)
  {
    com_contenu: "Maquette validée, je commence l'intégration du composant FlatList.",
    com_date: new Date("2026-03-10T08:45:00Z"),
    tsk_id: Long(14),
    usr_id: Long(4)   // David (assigné)
  },

  // Tâche 21 – Brief créatif (tab 3)
  {
    com_contenu: "Cible principale : 25-40 ans, axe différenciation sur la simplicité d'usage.",
    com_date: new Date("2026-03-06T09:00:00Z"),
    tsk_id: Long(21),
    usr_id: Long(2)   // Bob (créateur + assigné)
  },

  // Tâche 32 – Pipeline CI/CD (tab 4)
  {
    com_contenu: "Le workflow build passe, il reste à câbler le job de déploiement sur staging.",
    com_date: new Date("2026-03-07T13:00:00Z"),
    tsk_id: Long(32),
    usr_id: Long(3)   // Claire (assignée)
  },
  {
    com_contenu: "Ajout du cache des dépendances npm pour accélérer les builds.",
    com_date: new Date("2026-03-08T10:00:00Z"),
    tsk_id: Long(32),
    usr_id: Long(3)
  },

  // Tâche 44 – TP Spring Boot (tab 5)
  {
    com_contenu: "Le CRUD fonctionne, j'ajoute la pagination et la gestion des exceptions.",
    com_date: new Date("2026-03-08T16:00:00Z"),
    tsk_id: Long(44),
    usr_id: Long(1)   // Alice (assignée)
  },

  // Tâche 52 – Nettoyage dataset clients (tab 6)
  {
    com_contenu: "15 % de doublons détectés sur la clé email, suppression en cours.",
    com_date: new Date("2026-03-08T11:00:00Z"),
    tsk_id: Long(52),
    usr_id: Long(5)   // Emma (assignée)
  },

  // Tâche 54 – Modèle prédictif churn (tab 6)
  {
    com_contenu: "Première itération : précision de 78 %, je teste le gradient boosting en comparaison.",
    com_date: new Date("2026-03-09T14:00:00Z"),
    tsk_id: Long(54),
    usr_id: Long(4)   // David (assigné)
  }
]);

// ============================================================
// document_doc
// com_id présent uniquement si la PJ est liée à un commentaire
// ============================================================

// Récupère les _id des commentaires utiles (avec garde-fou)
const docAuditSEO = db.commentaire_com.findOne({ tsk_id: Long(1), usr_id: Long(1) });
const docCICD     = db.commentaire_com.findOne({ tsk_id: Long(32), usr_id: Long(3),
                      com_contenu: /cache/ });

if (!docAuditSEO || !docCICD) {
  throw new Error("Commentaires introuvables — vérifiez que insertMany a bien réussi.");
}

db.document_doc.insertMany([
  // PJ liée au commentaire "Rapport Screaming Frog" sur la tâche 1
  {
    doc_nom:    "screaming_frog_report.pdf",
    doc_type:   "application/pdf",
    doc_chemin: "/uploads/tab1/tsk1/screaming_frog_report.pdf",
    com_id:     docAuditSEO._id,   // ✅ ObjectId résolu
    tsk_id:     Long(1),
    usr_id:     Long(1)
  },

  // PJ liée au commentaire "cache npm" sur la tâche 32
  {
    doc_nom:    "workflow_ci_cache.yml",
    doc_type:   "text/plain",
    doc_chemin: "/uploads/tab4/tsk32/workflow_ci_cache.yml",
    com_id:     docCICD._id,       // ✅ ObjectId résolu
    tsk_id:     Long(32),
    usr_id:     Long(3)
  },

  // PJ directement sur la tâche 2 – Maquettes Figma (com_id absent)
  {
    doc_nom:    "maquettes_figma_v2.pdf",
    doc_type:   "application/pdf",
    doc_chemin: "/uploads/tab1/tsk2/maquettes_figma_v2.pdf",
    tsk_id:     Long(2),
    usr_id:     Long(1)
  },

  // PJ directement sur la tâche 52 – Nettoyage dataset (com_id absent)
  {
    doc_nom:    "dataset_clients_nettoye.zip",
    doc_type:   "application/zip",
    doc_chemin: "/uploads/tab6/tsk52/dataset_clients_nettoye.zip",
    tsk_id:     Long(52),
    usr_id:     Long(5)
  },

  // PJ directement sur la tâche 54 – Modèle churn (com_id absent)
  {
    doc_nom:    "churn_model_v1_results.pdf",
    doc_type:   "application/pdf",
    doc_chemin: "/uploads/tab6/tsk54/churn_model_v1_results.pdf",
    tsk_id:     Long(54),
    usr_id:     Long(4)
  },

  // PJ directement sur la tâche 44 – TP Spring Boot (com_id absent)
  {
    doc_nom:    "tp_spring_boot_enonce.pdf",
    doc_type:   "application/pdf",
    doc_chemin: "/uploads/tab5/tsk44/tp_spring_boot_enonce.pdf",
    tsk_id:     Long(44),
    usr_id:     Long(3)   // Claire (créatrice de la formation)
  }
]);

print("✔ Jeu de données MongoDB inséré : commentaire_com + document_doc");
