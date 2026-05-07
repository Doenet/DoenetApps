/*
  Warnings:

  - You are about to drop the column `assigned` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `individualizeByStudent` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttempts` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `mode` on the `assignments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `content`
    ADD COLUMN `individualizeByStudent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `maxAttempts` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    ADD COLUMN `mode` ENUM('formative', 'summative') NOT NULL DEFAULT 'formative';

 -- Copy assignment settings from assignment table to content table
UPDATE `content`
    INNER JOIN `assignments` ON content.id = assignments.rootContentId
    SET content.individualizeByStudent = assignments.individualizeByStudent,
    content.maxAttempts = assignments.maxAttempts,
    content.mode = assignments.mode;

-- DESTRUCTIVE: Turn all assignments back into normal activities, losing all student data.
DELETE FROM `submittedResponses`;
DELETE FROM `contentItemState`;
DELETE FROM `contentState`;
DELETE FROM `assignmentScores`;
DELETE FROM `assignments`;

-- AlterTable
ALTER TABLE `assignments` 
    DROP COLUMN `assigned`,
    DROP COLUMN `individualizeByStudent`,
    DROP COLUMN `maxAttempts`,
    DROP COLUMN `mode`,
    ADD COLUMN `codeValidStarting` DATETIME(3) NOT NULL,
    MODIFY `codeValidUntil` DATETIME(3) NOT NULL;