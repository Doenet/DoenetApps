-- AlterTable
ALTER TABLE `content`
    ADD COLUMN `deletionRootId` BINARY(16) NULL,
    ADD COLUMN `isDeletedOn` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `content` ADD CONSTRAINT `content_deletionRootId_fkey` FOREIGN KEY (`deletionRootId`) REFERENCES `content`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- `NOW()` is specific to MySQL
UPDATE `content` SET `isDeletedOn` = NOW(), `deletionRootId` = NULL WHERE `isDeleted` = 1;

ALTER TABLE `content`
DROP COLUMN `isDeleted`;