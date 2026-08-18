import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
nextEnv.loadEnvConfig(process.cwd());
const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT), database: process.env.MYSQL_DATABASE, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD });
const [columns] = await connection.query('SHOW COLUMNS FROM tickets');
const names = new Set(columns.map((column) => column.Field));
if (!names.has('lifecycle')) await connection.query("ALTER TABLE tickets ADD COLUMN lifecycle ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'OPEN' AFTER ticket_id");
if (names.has('ticket_id')) await connection.query("ALTER TABLE tickets MODIFY COLUMN ticket_id VARCHAR(36) NOT NULL");
if (!names.has('form_data')) await connection.query('ALTER TABLE tickets ADD COLUMN form_data JSON NULL AFTER description');
await connection.query(`CREATE TABLE IF NOT EXISTS ticket_attachments (
  id INT NOT NULL AUTO_INCREMENT,
  attachment_id VARCHAR(36) NOT NULL,
  ticket_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  content LONGBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY idx_ticket_attachments_attachment_id (attachment_id),
  KEY idx_ticket_attachments_ticket_id (ticket_id),
  CONSTRAINT fk_ticket_attachments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (ticket_id) ON DELETE CASCADE
)`);
await connection.end();
console.log('Database migration complete.');
