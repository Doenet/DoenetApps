import express from "express";
import {
  queryLoggedIn,
  queryOptionalLoggedIn,
} from "../middleware/queryMiddleware";
import {
  getCompoundEditorEdit,
  getCompoundEditorView,
  getDocEditorDoenetML,
  getDocEditorHistory,
  getEditor,
  getEditorSettings,
  getEditorShareStatus,
} from "../query/editor";
import { contentIdSchema } from "../schemas/contentSchema";

export const editorRouter = express.Router();

editorRouter.get(
  "/getEditor/:contentId",
  queryOptionalLoggedIn(getEditor, contentIdSchema),
);

editorRouter.get(
  "/getDocEditorDoenetML/:contentId",
  queryLoggedIn(getDocEditorDoenetML, contentIdSchema),
);

editorRouter.get(
  "/getCompoundEditorView/:contentId",
  queryLoggedIn(getCompoundEditorView, contentIdSchema),
);

editorRouter.get(
  "/getCompoundEditorEdit/:contentId",
  queryLoggedIn(getCompoundEditorEdit, contentIdSchema),
);

editorRouter.get(
  "/getEditorSettings/:contentId",
  queryLoggedIn(getEditorSettings, contentIdSchema),
);

editorRouter.get(
  "/getEditorShareStatus/:contentId",
  queryLoggedIn(getEditorShareStatus, contentIdSchema),
);

editorRouter.get(
  "/getDocEditorHistory/:contentId",
  queryLoggedIn(getDocEditorHistory, contentIdSchema),
);
