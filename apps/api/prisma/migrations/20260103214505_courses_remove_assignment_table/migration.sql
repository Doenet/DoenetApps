-- This migration assumes that `classCode` in `assignments` is unique, which is true on beta at the time of writing.

-- Drop foreign keys
ALTER TABLE `assignmentScores` DROP FOREIGN KEY `assignmentScores_contentId_fkey`;
ALTER TABLE `assignments` DROP FOREIGN KEY `assignments_rootContentId_fkey`;
ALTER TABLE `content` DROP FOREIGN KEY `content_nonRootAssignmentId_fkey`;
ALTER TABLE `contentState` DROP FOREIGN KEY `contentState_contentId_fkey`;

-- DropIndex
DROP INDEX `content_nonRootAssignmentId_fkey` ON `content`;

-- Add user fields
ALTER TABLE `users` ADD COLUMN `isPremium` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordHash` CHAR(60) NULL,
    ADD COLUMN `scopedToClassId` BINARY(16) NULL,
    ADD COLUMN `username` VARCHAR(191) NOT NULL,
    MODIFY `email` VARCHAR(191) NULL;

-- Add content fields, delete nonRootAssignmentId
ALTER TABLE `content` DROP COLUMN `nonRootAssignmentId`,
    ADD COLUMN `assignmentClosedOn` DATETIME(3) NULL,
    ADD COLUMN `assignmentOpenOn` DATETIME(3) NULL,
    ADD COLUMN `classCode` INTEGER UNSIGNED NULL,
    ADD COLUMN `courseRootId` BINARY(16) NULL,
    ADD COLUMN `isAssignmentRoot` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `content_classCode_key` ON `content`(`classCode`);

-- AddForeignKey
ALTER TABLE `content` ADD CONSTRAINT `content_courseRootId_fkey` FOREIGN KEY (`courseRootId`) REFERENCES `content`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignmentScores` ADD CONSTRAINT `assignmentScores_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contentState` ADD CONSTRAINT `contentState_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `content`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Copy data from `assignments` to `content`
UPDATE `content`
JOIN `assignments` ON content.id = assignments.rootContentId
SET 
  content.assignmentOpenOn = assignments.codeValidStarting,
  content.assignmentClosedOn = assignments.codeValidUntil,
  content.isAssignmentRoot = TRUE,
  content.classCode = CONVERT(assignments.classCode, UNSIGNED);

-- Mark all non-anonymous users as premium

UPDATE `users` SET username = email;
UPDATE `users` SET isPremium = TRUE WHERE isAnonymous = FALSE;

CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);


-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_scopedToClassId_fkey` FOREIGN KEY (`scopedToClassId`) REFERENCES `content`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- DropTable
DROP TABLE `assignments`;