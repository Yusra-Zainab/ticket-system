-- Run once before enabling the client-portal/resource portals.
-- These columns are referenced by the current admin project code in code-export.txt
-- but were not present in the supplied live schema snapshot.

SET @start_date_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'start_date'
);
SET @start_date_sql := IF(
  @start_date_exists = 0,
  "ALTER TABLE projects ADD COLUMN start_date DATE NULL AFTER progress",
  "SELECT 1"
);
PREPARE portal_stmt FROM @start_date_sql;
EXECUTE portal_stmt;
DEALLOCATE PREPARE portal_stmt;

SET @project_form_data_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'form_data'
);
SET @project_form_data_sql := IF(
  @project_form_data_exists = 0,
  "ALTER TABLE projects ADD COLUMN form_data JSON NULL AFTER lifecycle",
  "SELECT 1"
);
PREPARE portal_stmt FROM @project_form_data_sql;
EXECUTE portal_stmt;
DEALLOCATE PREPARE portal_stmt;

-- Strict client privacy needs a way to distinguish public conversation from
-- staff-only notes. The current comments table has no visibility column.
SET @visibility_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'visibility'
);
SET @visibility_sql := IF(
  @visibility_exists = 0,
  "ALTER TABLE comments ADD COLUMN visibility ENUM('PUBLIC','INTERNAL') NOT NULL DEFAULT 'PUBLIC' AFTER content",
  "SELECT 1"
);
PREPARE portal_stmt FROM @visibility_sql;
EXECUTE portal_stmt;
DEALLOCATE PREPARE portal_stmt;
