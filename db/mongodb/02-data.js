// ============================================================
// data.js – Jeu de données de démonstration MongoDB
// Projet Kanban SI-SOR 2026
// Références tsk_id et usr_id cohérentes avec db/mariadb/data.sql
// (1 = Liutwin, 2 = Visiteur)
// ============================================================

use("e22408439_kanban");

// ============================================================
// commentaire_com
// ============================================================
db.commentaire_com.insertMany([
  // Tâche 7 – Formulaire de contact
  {
    com_contenu: "Formulaire en place : envoi SMTP par le backend Deno, champ piège et limitation du nombre d'envois contre le spam.",
    com_date: new Date("2026-10-27T13:30:00Z"),
    tsk_id: Long(7),
    usr_id: Long(1)
  },

  // Tâche 8 – Chaîne CI/CD GitHub Actions
  {
    com_contenu: "Même structure que pour Stage Bois Bretagne : test, build vers ghcr.io, puis déploiement par SSH avec génération du .env depuis les secrets.",
    com_date: new Date("2026-10-30T16:45:00Z"),
    tsk_id: Long(8),
    usr_id: Long(1)
  },

  // Tâche 9 – Déploiement du kanban
  {
    com_contenu: "Bases MariaDB et MongoDB passées dans le Compose, initialisées par les scripts de db/ au premier démarrage. Seul nginx est exposé, sur 127.0.0.1.",
    com_date: new Date("2026-11-08T17:50:00Z"),
    tsk_id: Long(9),
    usr_id: Long(1)
  },

  // Tâche 10 – Capture du kanban
  {
    com_contenu: "Vous pouvez déplacer les tâches et en créer : ce tableau sert de démonstration.",
    com_date: new Date("2026-11-08T20:30:00Z"),
    tsk_id: Long(10),
    usr_id: Long(1)
  }
]);

// ============================================================
// document_doc
// Aucune pièce jointe : les fichiers référencés devraient exister
// dans le volume uploads_data du conteneur Spring.
// ============================================================
