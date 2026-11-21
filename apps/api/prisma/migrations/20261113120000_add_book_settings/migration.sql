-- Mark folders as books: a folder with a row here can be read in reading mode.
--
-- Additive only (a new table, nothing changed on `content`), so it is safe to
-- run while the previous code is still serving.

-- CreateTable
CREATE TABLE `bookSettings` (
  `contentId` BINARY(16) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`contentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bookSettings`
  ADD CONSTRAINT `bookSettings_contentId_fkey`
  FOREIGN KEY (`contentId`) REFERENCES `content`(`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;
