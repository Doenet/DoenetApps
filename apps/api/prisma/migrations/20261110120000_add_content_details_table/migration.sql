-- Add a 1:1 `contentDetails` table holding optional author-written metadata
-- (starting with a public `description`).
--
-- This is deliberately a separate table rather than a new column on `content`:
-- `ADD COLUMN` on `content` forces a full table rebuild (its FULLTEXT indexes
-- rule out instant DDL), which exceeds the deploy timeout. Creating a new table
-- and a foreign key to `content` is fast and needs no out-of-band migration.

-- CreateTable
CREATE TABLE `contentDetails` (
  `contentId` BINARY(16) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`contentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contentDetails`
  ADD CONSTRAINT `contentDetails_contentId_fkey`
  FOREIGN KEY (`contentId`) REFERENCES `content`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;
