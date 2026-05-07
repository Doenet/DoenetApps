-- AlterTable
ALTER TABLE `content` ADD COLUMN `visibility` ENUM('private', 'unlisted', 'public') NOT NULL DEFAULT 'private';

UPDATE `content` SET `visibility` = 'public' WHERE `isPublic` = true;