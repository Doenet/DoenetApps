-- AlterTable
ALTER TABLE `users` ADD COLUMN `theme` ENUM('system', 'light', 'dark') NOT NULL DEFAULT 'system';
