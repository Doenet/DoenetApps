/*
Note: This migration deletes all library-related data, specifically: 
 - All curated content aka content owned by the library (but NOT the original source content)
 - All library event history
 - All library infos records


  Warnings:

  - You are about to drop the column `comments` on the `libraryActivityInfos` table. All the data in the column will be lost.
  - The values [PENDING_REVIEW,REQUEST_REMOVED,NEEDS_REVISION] on the enum `libraryActivityInfos_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `comments` on the `libraryEvents` table. All the data in the column will be lost.
  - You are about to drop the column `contentId` on the `libraryEvents` table. All the data in the column will be lost.
  - You are about to drop the column `sourceId` on the `libraryEvents` table. All the data in the column will be lost.
  - The values [SUBMIT_REQUEST,CANCEL_REQUEST,ADD_DRAFT,DELETE_DRAFT,MARK_NEEDS_REVISION,MODIFY_COMMENTS] on the enum `libraryEvents_eventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isAdmin` on the `users` table. All the data in the column will be lost.
  - Made the column `contentId` on table `libraryActivityInfos` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `infoId` to the `libraryEvents` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `contentRevisions` DROP FOREIGN KEY `contentRevisions_contentId_fkey`;

-- DropForeignKey
ALTER TABLE `contentViews` DROP FOREIGN KEY `contentViews_contentId_fkey`;

-- DropForeignKey
ALTER TABLE `contributorHistory` DROP FOREIGN KEY `contributorHistory_originContentId_originContentRevisionNum_fkey`;

-- DropForeignKey
ALTER TABLE `contributorHistory` DROP FOREIGN KEY `contributorHistory_remixContentId_remixContentRevisionNum_fkey`;

-- DropForeignKey
ALTER TABLE `libraryActivityInfos` DROP FOREIGN KEY `libraryActivityInfos_contentId_fkey`;

-- DropForeignKey
ALTER TABLE `libraryEvents` DROP FOREIGN KEY `libraryEvents_contentId_fkey`;

-- DropForeignKey
ALTER TABLE `libraryEvents` DROP FOREIGN KEY `libraryEvents_sourceId_fkey`;

-- DropForeignKey
ALTER TABLE `recentContent` DROP FOREIGN KEY `recentContent_contentId_fkey`;

-- DropIndex
DROP INDEX `contentViews_contentId_fkey` ON `contentViews`;

-- DropIndex
DROP INDEX `contributorHistory_remixContentId_remixContentRevisionNum_fkey` ON `contributorHistory`;

-- DropIndex
DROP INDEX `libraryEvents_contentId_fkey` ON `libraryEvents`;

-- DropIndex
DROP INDEX `libraryEvents_sourceId_fkey` ON `libraryEvents`;

-- DropIndex
DROP INDEX `recentContent_contentId_fkey` ON `recentContent`;

-- AddForeignKey
ALTER TABLE `recentContent` ADD CONSTRAINT `recentContent_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contentRevisions` ADD CONSTRAINT `contentRevisions_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contributorHistory` ADD CONSTRAINT `contributorHistory_remixContentId_remixContentRevisionNum_fkey` FOREIGN KEY (`remixContentId`, `remixContentRevisionNum`) REFERENCES `contentRevisions`(`contentId`, `revisionNum`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contributorHistory` ADD CONSTRAINT `contributorHistory_originContentId_originContentRevisionNum_fkey` FOREIGN KEY (`originContentId`, `originContentRevisionNum`) REFERENCES `contentRevisions`(`contentId`, `revisionNum`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contentViews` ADD CONSTRAINT `contentViews_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;



-- Clear out all library data. DESTRUCTIVE!
DELETE FROM libraryEvents;

DELETE libraryActivityInfos, content FROM libraryActivityInfos
-- Note: we're deleting library-owned content, hence we use `.contentId` and definitely not `.sourceId`
LEFT JOIN content ON libraryActivityInfos.contentId = content.id;


-- AlterTable
ALTER TABLE `libraryActivityInfos` DROP COLUMN `comments`,
    ADD COLUMN `primaryEditorId` BINARY(16) NULL,
    ADD COLUMN `requestedOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `contentId` BINARY(16) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED') NOT NULL;

-- AlterTable
ALTER TABLE `libraryEvents` DROP COLUMN `comments`,
    DROP COLUMN `contentId`,
    DROP COLUMN `sourceId`,
    ADD COLUMN `comment` VARCHAR(191) NULL,
    ADD COLUMN `infoId` BINARY(16) NOT NULL,
    MODIFY `eventType` ENUM('SUGGEST_REVIEW', 'TAKE_OWNERSHIP', 'PUBLISH', 'UNPUBLISH', 'REJECT', 'ADD_COMMENT') NOT NULL;


-- AddForeignKey
ALTER TABLE `libraryActivityInfos` ADD CONSTRAINT `libraryActivityInfos_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `libraryActivityInfos` ADD CONSTRAINT `libraryActivityInfos_primaryEditorId_fkey` FOREIGN KEY (`primaryEditorId`) REFERENCES `users`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `libraryEvents` ADD CONSTRAINT `libraryEvents_infoId_fkey` FOREIGN KEY (`infoId`) REFERENCES `libraryActivityInfos`(`sourceId`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Rename admins to editors
ALTER TABLE `users` RENAME COLUMN `isAdmin` TO `isEditor`;
