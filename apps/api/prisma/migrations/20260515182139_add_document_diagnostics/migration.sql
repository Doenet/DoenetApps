-- AlterTable
ALTER TABLE `content`
ADD COLUMN `accessibilityCheck` ENUM ('unchecked', 'pass', 'fail') NOT NULL DEFAULT 'unchecked',
ADD COLUMN `errorsCheck` ENUM ('unchecked', 'pass', 'fail') NOT NULL DEFAULT 'unchecked';
