import nextEnv from "@next/env";
import mysql from "mysql2/promise";

nextEnv.loadEnvConfig(process.cwd());

const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number.parseInt(process.env.MYSQL_PORT ?? "3306", 10) || 3306,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  charset: "utf8mb4",
});

async function tableColumns(table) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return new Set(rows.map((row) => row.name));
}

async function columnType(table, column) {
  const [rows] = await connection.query(
    `SELECT DATA_TYPE AS type FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows[0]?.type;
}

async function ensureColumn(table, column, definition) {
  const columns = await tableColumns(table);
  if (!columns.has(column)) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureIndex(table, index, expression) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index],
  );
  if (Number(rows[0]?.count ?? 0) === 0) {
    await connection.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` (${expression})`);
  }
}

await connection.query(`CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(64) NOT NULL,
  lifecycle ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'DRAFT',
  title VARCHAR(255) NOT NULL DEFAULT '',
  description MEDIUMTEXT NULL,
  form_data JSON NULL,
  priority_type VARCHAR(32) NOT NULL DEFAULT 'Not Assigned',
  priority_number INT NOT NULL DEFAULT 4,
  type VARCHAR(100) NOT NULL DEFAULT 'Task',
  project_id INT NULL,
  created_by INT NULL,
  assigned_to INT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  created_date DATE NULL,
  deadline DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  project VARCHAR(200) NOT NULL DEFAULT '',
  priority TINYINT UNSIGNED NOT NULL DEFAULT 4,
  reporter VARCHAR(255) NOT NULL DEFAULT '',
  due_date DATETIME NULL,
  tags JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_tickets_ticket_id (ticket_id)
)`);

for (const [column, definition] of [
  ["lifecycle", "ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'DRAFT'"],
  ["form_data", "JSON NULL"],
  ["priority_type", "VARCHAR(32) NOT NULL DEFAULT 'Not Assigned'"],
  ["priority_number", "INT NOT NULL DEFAULT 4"],
  ["type", "VARCHAR(100) NOT NULL DEFAULT 'Task'"],
  ["project_id", "INT NULL"],
  ["created_by", "INT NULL"],
  ["created_date", "DATE NULL"],
  ["deadline", "DATE NULL"],
]) {
  await ensureColumn("tickets", column, definition);
}

const ticketColumns = await tableColumns("tickets");
if (
  ticketColumns.has("assigned_to") &&
  (await columnType("tickets", "assigned_to")) === "varchar" &&
  !(await tableColumns("tickets")).has("assigned_to_id")
) {
  await ensureColumn("tickets", "assigned_to_id", "INT NULL");
  if (ticketColumns.has("project")) {
    await connection.query(`UPDATE tickets t JOIN projects p ON p.name = t.project SET t.project_id = p.id WHERE t.project_id IS NULL`);
  }
  if (ticketColumns.has("reporter")) {
    await connection.query(`UPDATE tickets t JOIN users u ON u.name = t.reporter SET t.created_by = u.id WHERE t.created_by IS NULL`);
  }
  await connection.query(`UPDATE tickets t JOIN users u ON u.name = t.assigned_to SET t.assigned_to_id = u.id WHERE t.assigned_to_id IS NULL AND t.assigned_to <> 'Unassigned'`);
  await connection.query("ALTER TABLE tickets CHANGE COLUMN assigned_to assigned_to_legacy VARCHAR(255) NULL");
  await connection.query("ALTER TABLE tickets ADD COLUMN assigned_to INT NULL AFTER created_by");
  await connection.query("UPDATE tickets SET assigned_to = assigned_to_id");
  await connection.query("ALTER TABLE tickets DROP COLUMN assigned_to_id");
}

const refreshedTicketColumns = await tableColumns("tickets");
if (refreshedTicketColumns.has("priority")) {
  await connection.query(`UPDATE tickets SET priority_number = COALESCE(NULLIF(priority_number, 0), priority), priority_type = CASE priority WHEN 1 THEN 'Critical' WHEN 2 THEN 'High' WHEN 3 THEN 'Medium' WHEN 4 THEN 'Low' ELSE 'Not Assigned' END WHERE priority_type = 'Not Assigned'`);
}
if (refreshedTicketColumns.has("created_at")) {
  await connection.query("UPDATE tickets SET created_date = COALESCE(created_date, DATE(created_at)) WHERE created_date IS NULL");
}
if (refreshedTicketColumns.has("due_date")) {
  await connection.query("UPDATE tickets SET deadline = COALESCE(deadline, DATE(due_date)) WHERE deadline IS NULL");
}

await ensureIndex("tickets", "idx_tickets_lifecycle_updated", "lifecycle, updated_at");
await ensureIndex("tickets", "idx_tickets_project", "project_id");

await connection.query(`CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT NOT NULL AUTO_INCREMENT,
  attachment_id VARCHAR(64) NOT NULL,
  ticket_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  content LONGBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY idx_ticket_attachments_attachment_id (attachment_id),
  KEY idx_ticket_attachments_ticket_id (ticket_id),
  CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id) ON DELETE CASCADE
)`);

for (const [column, definition] of [
  ["lifecycle", "ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'OPEN'"],
  ["priority_type", "VARCHAR(32) NOT NULL DEFAULT 'Not Assigned'"],
  ["start_date", "DATE NULL"],
  ["form_data", "JSON NULL"],
]) {
  await ensureColumn("projects", column, definition);
}

await connection.query(`CREATE TABLE IF NOT EXISTS project_attachments (
  attachment_id VARCHAR(64) NOT NULL,
  project_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  KEY idx_project_attachments_project (project_id),
  CONSTRAINT fk_project_attachments_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
)`);

await connection.query(`CREATE TABLE IF NOT EXISTS project_resources (
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  KEY idx_project_resources_user (user_id),
  CONSTRAINT fk_project_resources_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_resources_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

/*
 * Profile pictures. `users.avatar` is a varchar(255) that only ever holds a
 * URL string ("/api/avatars/{id}?v=..." for uploads, or an external
 * https:// URL). The image bytes live here, one row per user.
 */
await connection.query(`CREATE TABLE IF NOT EXISTS user_avatars (
  user_id INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  image_data LONGBLOB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_avatars_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

/*
 * The column used to be written with full data: URLs, which silently
 * truncated at 255 chars — every one of those is unusable. Clear them so
 * the UI falls back to initials until the user re-uploads.
 */
await connection.query(
  "UPDATE users SET avatar = NULL WHERE avatar LIKE 'data:%'",
);

await connection.end();
console.log("Database migration complete.");
