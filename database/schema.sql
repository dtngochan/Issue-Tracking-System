-- ============================================================
-- HỆ THỐNG QUẢN LÝ LỖI VÀ PHÂN LOẠI SỰ CỐ (ISSUE TRACKING SYSTEM)
-- DATABASE SCHEMA FOR MYSQL / NAVICAT
-- ============================================================

CREATE DATABASE IF NOT EXISTS `issue_tracking_db` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `issue_tracking_db`;

-- Xóa các bảng cũ theo thứ tự ràng buộc khóa ngoại (nếu tồn tại)
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `issue_history`;
DROP TABLE IF EXISTS `issue_comments`;
DROP TABLE IF EXISTS `issues`;
DROP TABLE IF EXISTS `modules`;
DROP TABLE IF EXISTS `project_members`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `users`;

-- ------------------------------------------------------------
-- 1. BẢNG USERS (NĐT / Nhân sự hệ thống)
-- ------------------------------------------------------------
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `global_role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. BẢNG PROJECTS (Dự án phần mềm)
-- ------------------------------------------------------------
CREATE TABLE `projects` (
  `project_id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_key` VARCHAR(10) NOT NULL UNIQUE COMMENT 'VD: PRJ-01, ECOM',
  `project_name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `start_date` DATE DEFAULT NULL,
  `expected_end_date` DATE DEFAULT NULL,
  `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'ARCHIVED = Chỉ đọc (Read-only)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. BẢNG PROJECT_MEMBERS (Phân bổ nhân sự vào Dự án)
-- ------------------------------------------------------------
CREATE TABLE `project_members` (
  `member_id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `project_role` ENUM('PM', 'DEV', 'QA') NOT NULL,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_project_user` (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. BẢNG MODULES (Phân hệ tính năng của Dự án)
-- ------------------------------------------------------------
CREATE TABLE `modules` (
  `module_id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `module_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `default_assignee_id` INT DEFAULT NULL COMMENT 'Dev phụ trách chính mặc định',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE,
  FOREIGN KEY (`default_assignee_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. BẢNG ISSUES (Bản ghi lỗi / sự cố cốt lõi)
-- ------------------------------------------------------------
CREATE TABLE `issues` (
  `issue_id` INT AUTO_INCREMENT PRIMARY KEY,
  `issue_key` VARCHAR(20) NOT NULL UNIQUE COMMENT 'VD: ECOM-101',
  `project_id` INT NOT NULL,
  `module_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `steps_to_reproduce` TEXT DEFAULT NULL,
  `raw_logs` TEXT DEFAULT NULL COMMENT 'Dữ liệu Console/Stacktrace log để AI auto-triage',
  `environment` ENUM('DEV', 'STAGING', 'PRODUCTION') NOT NULL DEFAULT 'DEV',
  `issue_type` ENUM('BUG', 'INCIDENT', 'ENHANCEMENT') NOT NULL DEFAULT 'BUG',
  `severity` ENUM('CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL') NOT NULL DEFAULT 'MAJOR',
  `priority` ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED', 'DUPLICATE', 'DEFERRED') NOT NULL DEFAULT 'NEW',
  `confidence_score` FLOAT DEFAULT 0 COMMENT 'Điểm tin cậy của Auto-triage (%)',
  `reporter_id` INT NOT NULL COMMENT 'QA/User tạo lỗi',
  `assignee_id` INT DEFAULT NULL COMMENT 'Dev được giao xử lý',
  `git_commit_ref` VARCHAR(255) DEFAULT NULL COMMENT 'Link Pull Request hoặc Commit Hash fix bug',
  `sla_due_date` DATETIME DEFAULT NULL COMMENT 'Thời hạn phải hoàn thành theo SLA',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `modules` (`module_id`) ON DELETE SET NULL,
  FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignee_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. BẢNG ISSUE_COMMENTS (Bình luận & Thảo luận)
-- ------------------------------------------------------------
CREATE TABLE `issue_comments` (
  `comment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `issue_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`issue_id`) REFERENCES `issues` (`issue_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. BẢNG ISSUE_HISTORY (Audit Log - Lưu vết thay đổi)
-- ------------------------------------------------------------
CREATE TABLE `issue_history` (
  `history_id` INT AUTO_INCREMENT PRIMARY KEY,
  `issue_id` INT NOT NULL,
  `changed_by` INT NOT NULL,
  `field_name` VARCHAR(50) NOT NULL COMMENT 'Tên trường thay đổi (VD: Status, Assignee, Severity)',
  `old_value` VARCHAR(255) DEFAULT NULL,
  `new_value` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`issue_id`) REFERENCES `issues` (`issue_id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. BẢNG ATTACHMENTS (Tệp đính kèm)
-- ------------------------------------------------------------
CREATE TABLE `attachments` (
  `attachment_id` INT AUTO_INCREMENT PRIMARY KEY,
  `issue_id` INT NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` TEXT NOT NULL,
  `file_type` VARCHAR(50) DEFAULT NULL,
  `uploaded_by` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`issue_id`) REFERENCES `issues` (`issue_id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
