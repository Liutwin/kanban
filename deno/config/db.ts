// config/db.ts
import mysql from "npm:mysql2/promise";
import "jsr:@std/dotenv/load";

// Reprend les mêmes paramètres que ton application.properties
export const db = await mysql.createPool({
  host:     Deno.env.get("DB_HOST"),
  port:     Number(Deno.env.get("DB_PORT")),
  database: Deno.env.get("DB_NAME"),
  user:     Deno.env.get("DB_USER"),
  password: Deno.env.get("DB_PASSWORD"),
  waitForConnections: true,
  connectionLimit: 5
});

// Vérifie la connexion au démarrage en empruntant une connexion du pool
try {
  const conn = await db.getConnection();
  console.log("✅ Connexion MariaDB établie");
  conn.release(); // Remet la connexion dans le pool
} catch (err) {
  console.error("❌ Connexion MariaDB échouée");
  Deno.exit(1); // Inutile de démarrer si la BDD est inaccessible
}