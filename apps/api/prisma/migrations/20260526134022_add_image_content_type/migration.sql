-- AlterTable: extend ContentType enum with `image` and add image-metadata columns
ALTER TABLE `content`
  MODIFY `type` ENUM('singleDoc', 'select', 'sequence', 'folder', 'image') NOT NULL DEFAULT 'singleDoc',
  ADD COLUMN `mimeType` VARCHAR(64) NULL,
  ADD COLUMN `sizeBytes` BIGINT NULL,
  ADD COLUMN `imageWidth` INT NULL,
  ADD COLUMN `imageHeight` INT NULL,
  ADD COLUMN `s3Key` VARCHAR(255) NULL;
