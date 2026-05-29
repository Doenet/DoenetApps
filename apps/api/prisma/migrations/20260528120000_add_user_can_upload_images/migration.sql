-- Early-access flag for the experimental image-upload feature.
ALTER TABLE `users`
  ADD COLUMN `canUploadImages` BOOLEAN NOT NULL DEFAULT FALSE;
