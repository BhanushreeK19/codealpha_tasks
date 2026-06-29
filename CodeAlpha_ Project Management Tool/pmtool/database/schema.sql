-- ============================================================================
--  PM Tool — Database Schema (MySQL 8+)
--  A Trello/Asana-style project management platform
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pmtool_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pmtool_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- roles  — global system roles (RBAC)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,   -- ROLE_ADMIN, ROLE_PROJECT_MANAGER, ROLE_MEMBER
    description VARCHAR(255)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(120) NOT NULL,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,        -- BCrypt hash
    avatar_color    VARCHAR(7)  DEFAULT '#6366F1', -- generated UI avatar accent
    is_enabled      BOOLEAN     DEFAULT TRUE,
    created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- user_roles  — many-to-many join (a user may hold multiple system roles)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL,
    description  TEXT,
    project_key  VARCHAR(10)  NOT NULL UNIQUE,    -- e.g. "TPX" used in task codes like TPX-14
    color        VARCHAR(7)   DEFAULT '#6366F1',
    owner_id     BIGINT       NOT NULL,
    is_archived  BOOLEAN      DEFAULT FALSE,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- project_members — who belongs to a project + their in-project role
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS project_members;
CREATE TABLE project_members (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    project_role ENUM('OWNER', 'MANAGER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_member (project_id, user_id),
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- boards — Kanban boards; a project can have multiple boards
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS boards;
CREATE TABLE boards (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    name        VARCHAR(120) NOT NULL,
    position    INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_boards_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- tasks — cards on the Kanban board
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    board_id        BIGINT NOT NULL,
    project_id      BIGINT NOT NULL,
    task_code       VARCHAR(20) NOT NULL,           -- e.g. TPX-14
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    status          ENUM('TODO','IN_PROGRESS','DONE') NOT NULL DEFAULT 'TODO',
    priority        ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
    position        INT DEFAULT 0,                  -- ordering within a status column
    due_date        DATE,
    assignee_id     BIGINT,
    reporter_id     BIGINT NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_task_code (task_code),
    CONSTRAINT fk_tasks_board    FOREIGN KEY (board_id)    REFERENCES boards(id)   ON DELETE CASCADE,
    CONSTRAINT fk_tasks_project  FOREIGN KEY (project_id)  REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id)    ON DELETE SET NULL,
    CONSTRAINT fk_tasks_reporter FOREIGN KEY (reporter_id) REFERENCES users(id)    ON DELETE CASCADE,
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_assignee (assignee_id),
    INDEX idx_tasks_project (project_id)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- comments — discussion thread on a task
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS comments;
CREATE TABLE comments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id     BIGINT NOT NULL,
    author_id   BIGINT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_comments_task   FOREIGN KEY (task_id)   REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_task (task_id)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- comment_mentions — @mentions inside a comment (for notification fan-out)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS comment_mentions;
CREATE TABLE comment_mentions (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    comment_id  BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    CONSTRAINT fk_mentions_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentions_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT NOT NULL,
    actor_id     BIGINT,                              -- who triggered it (nullable for system events)
    type         ENUM('TASK_ASSIGNED','TASK_STATUS_CHANGED','NEW_COMMENT','MENTION','PROJECT_INVITE') NOT NULL,
    message      VARCHAR(255) NOT NULL,
    task_id      BIGINT,
    project_id   BIGINT,
    is_read      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor     FOREIGN KEY (actor_id)     REFERENCES users(id)    ON DELETE SET NULL,
    CONSTRAINT fk_notif_task      FOREIGN KEY (task_id)      REFERENCES tasks(id)    ON DELETE CASCADE,
    CONSTRAINT fk_notif_project   FOREIGN KEY (project_id)   REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_notif_recipient (recipient_id, is_read)
) ENGINE = InnoDB;

-- ----------------------------------------------------------------------------
-- activity_log — recent activity feed shown on the dashboard
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    actor_id    BIGINT NOT NULL,
    action      VARCHAR(255) NOT NULL,    -- e.g. "moved task TPX-14 to Done"
    task_id     BIGINT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_actor   FOREIGN KEY (actor_id)   REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_activity_task    FOREIGN KEY (task_id)    REFERENCES tasks(id)    ON DELETE SET NULL,
    INDEX idx_activity_project (project_id, created_at)
) ENGINE = InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- Seed data: default roles
-- ============================================================================
INSERT INTO roles (name, description) VALUES
    ('ROLE_ADMIN', 'Full system access'),
    ('ROLE_PROJECT_MANAGER', 'Can create and manage projects'),
    ('ROLE_MEMBER', 'Standard team member');

-- ============================================================================
-- Optional: demo data for quick manual testing
-- Password for both demo users is "Password123!" (BCrypt hash below)
-- ============================================================================
-- INSERT INTO users (full_name, username, email, password, avatar_color) VALUES
--   ('Ada Lovelace', 'ada', 'ada@example.com', '$2a$10$replace_with_real_bcrypt_hash', '#6366F1'),
--   ('Grace Hopper', 'grace', 'grace@example.com', '$2a$10$replace_with_real_bcrypt_hash', '#22C55E');

SELECT id, task_code, title
FROM tasks;

SELECT MAX(task_code)
FROM tasks;
