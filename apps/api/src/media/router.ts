import express from "express";
import { handleServeImage } from "./serve";
import {
  handleUploadError,
  handleUploadImage,
  uploadImageMulter,
} from "./upload";

export const mediaRouter = express.Router();

mediaRouter.post(
  "/image",
  uploadImageMulter.single("file"),
  handleUploadError,
  handleUploadImage,
);

mediaRouter.get("/:contentId", handleServeImage);
