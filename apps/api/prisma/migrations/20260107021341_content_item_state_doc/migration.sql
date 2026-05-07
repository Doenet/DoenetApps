-- AddForeignKey
ALTER TABLE `contentItemState` ADD CONSTRAINT `contentItemState_docId_fkey` FOREIGN KEY (`docId`) REFERENCES `content`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
