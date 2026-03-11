// config/db.ts
import mysql from "npm:mysql2/promise";

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

console.log("✅ Connexion MariaDB établie");