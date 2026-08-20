-- Run once against the same MySQL database used by the app.
-- If a column/table already exists, skip that statement.

ALTER TABLE projects
  ADD COLUMN lifecycle ENUM('DRAFT','OPEN') NOT NULL DEFAULT 'OPEN';

ALTER TABLE projects
  ADD COLUMN priority_type VARCHAR(32) NOT NULL DEFAULT 'Not Assigned';

ALTER TABLE projects
  ADD COLUMN start_date DATE NULL;

ALTER TABLE projects
  ADD COLUMN form_data JSON NULL;

CREATE TABLE IF NOT EXISTS project_resources (
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT fk_project_resources_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_resources_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_attachments (
  attachment_id VARCHAR(64) NOT NULL,
  project_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  file_data LONGBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  KEY idx_project_attachments_project (project_id),
  CONSTRAINT fk_project_attachments_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_lifecycle_updated
  ON projects(lifecycle, updated_at);

CREATE INDEX idx_project_resources_user
  ON project_resources(user_id);
