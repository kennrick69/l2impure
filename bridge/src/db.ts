/**
 * MySQL pool singleton. mysql2/promise pra suportar await direto.
 * Pool tamanho 10 — ajustar conforme load.
 */
import mysql from "mysql2/promise";
import { env } from "./env.js";

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  // L2J usa latin1 nos accounts
  charset: "utf8mb4",
  // Pool reaproveita conexões; se cair, reconecta
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/** Testa conectividade com um SELECT 1 */
export async function pingDb(): Promise<boolean> {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    return Array.isArray(rows) && rows.length === 1;
  } catch {
    return false;
  }
}
