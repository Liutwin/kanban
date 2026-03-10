// config/db.ts
import mysql from "npm:mysql2/promise";

// Reprend les mêmes paramètres que ton application.properties
export const db = await mysql.createPool({
  host:     "obiwan.univ-brest.fr",
  port:     3306,
  database: "e22408439_db1",
  user:     "e22408439sql",
  password: "***REMOVED***",        // ← mettre le vrai mot de passe
  waitForConnections: true,
  connectionLimit: 5,
});

console.log("✅ Connexion MariaDB établie");
