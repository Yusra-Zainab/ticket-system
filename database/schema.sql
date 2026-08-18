CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  project VARCHAR(200) NOT NULL,
  lifecycle ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'DRAFT',
  status VARCHAR(50) NOT NULL DEFAULT 'Open',
  priority TINYINT UNSIGNED NOT NULL DEFAULT 4,
  assigned_to VARCHAR(200) NOT NULL DEFAULT 'Unassigned',
  reporter VARCHAR(200) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  due_date DATETIME NULL,
  description MEDIUMTEXT NOT NULL,
  tags JSON NOT NULL,
  form_data JSON NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_tickets_ticket_id (ticket_id),
  INDEX idx_tickets_lifecycle_updated (lifecycle, updated_at),
  INDEX idx_tickets_status (status)
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
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
);
