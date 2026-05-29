-- Generalize the storage-key column name. The value is still the object key
-- used by whatever storage adapter is wired up (currently S3).
ALTER TABLE `content` CHANGE COLUMN `s3Key` `storageKey` VARCHAR(255) NULL;
