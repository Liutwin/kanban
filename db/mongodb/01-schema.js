// ============================================================
// mongo_init.js – Initialisation de la base MongoDB
// Projet Kanban SI-SOR 2026
// À exécuter via : mongosh < mongo_init.js
// ============================================================

use("e22408439_kanban");

db.commentaire_com.drop();
db.document_doc.drop();

// ============================================================
// Collection : commentaire_com
// tsk_id et usr_id référencent MariaDB
// ============================================================
db.createCollection("commentaire_com", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["com_contenu", "com_date", "tsk_id", "usr_id"],
      properties: {
        _id:        { bsonType: "objectId" },
        com_contenu: {
          bsonType: "string",
          maxLength: 1000,
          description: "Contenu du commentaire (obligatoire)"
        },
        com_date: {
          bsonType: "date",
          description: "Date de création (obligatoire)"
        },
        tsk_id: {
          bsonType: "long",
          minimum: 1,
          description: "Référence tache_tsk.tsk_id (MariaDB)"
        },
        usr_id: {
          bsonType: "long",
          minimum: 1,
          description: "Référence utilisateur_usr.usr_id (MariaDB)"
        }
      },
      additionalProperties: false
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.commentaire_com.createIndex({ tsk_id: 1 },             { name: "idx_com_tsk" });
db.commentaire_com.createIndex({ usr_id: 1 },             { name: "idx_com_usr" });
db.commentaire_com.createIndex({ tsk_id: 1, com_date: 1 },{ name: "idx_com_tsk_date" });

// ============================================================
// Collection : document_doc
// com_id optionnel → pièce jointe liée à un commentaire
// ============================================================
db.createCollection("document_doc", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["doc_nom", "doc_type", "doc_chemin", "tsk_id", "usr_id"],
      properties: {
        _id:        { bsonType: "objectId" },
        doc_nom:    { bsonType: "string", maxLength: 255,
                      description: "Nom original du fichier" },
        doc_type:   { bsonType: "string", maxLength: 255,
                      description: "Type MIME du fichier" },  // ✅ corrigé : pas d'enum
        doc_chemin: { bsonType: "string", maxLength: 512,
                      description: "Chemin de stockage sur le serveur" },
        com_id:     { bsonType: ["objectId", "null"],          // ✅ accepte null (Spring Data) ou absent
                      description: "Référence optionnelle vers un commentaire" },
        tsk_id:     { bsonType: "long", minimum: 1,
                      description: "Référence tache_tsk.tsk_id (MariaDB)" },
        usr_id:     { bsonType: "long", minimum: 1,
                      description: "Référence utilisateur_usr.usr_id (MariaDB)" }
      },
      additionalProperties: false
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

db.document_doc.createIndex({ tsk_id: 1 }, { name: "idx_doc_tsk" });
db.document_doc.createIndex({ com_id: 1 }, { name: "idx_doc_com" });
db.document_doc.createIndex({ usr_id: 1 }, { name: "idx_doc_usr" });

print("✔ MongoDB initialisé : commentaire_com + document_doc");
