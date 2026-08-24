CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(64) NOT NULL,
  lifecycle ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'DRAFT',
  title VARCHAR(200) NOT NULL,
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

  -- Legacy fields are retained for migration/backfill compatibility.
  project VARCHAR(200) NOT NULL DEFAULT '',
  priority TINYINT UNSIGNED NOT NULL DEFAULT 4,
  reporter VARCHAR(255) NOT NULL DEFAULT '',
  due_date DATETIME NULL,
  tags JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_tickets_ticket_id (ticket_id),
  INDEX idx_tickets_lifecycle_updated (lifecycle, updated_at),
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_project (project_id)
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
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
);

CREATE TABLE IF NOT EXISTS project_resources (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (project_id, user_id),

    CONSTRAINT fk_project_resources_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_project_resources_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_project_resources_user
ON project_resources(user_id);

CREATE TABLE IF NOT EXISTS project_attachments (
  attachment_id VARCHAR(64) NOT NULL,
  project_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  KEY idx_project_attachments_project (project_id),
  CONSTRAINT fk_project_attachments_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
