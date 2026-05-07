import express from "express";
import {
  createStudentHandleAccounts,
  getUser,
  getUserInfoIfLoggedIn,
  setIsAuthor,
  updateUser,
} from "../query/user";
import {
  createHandleSchema,
  setIsAuthorSchema,
  userIdSchema,
  userNamesSchema,
} from "../schemas/userSchemas";
import {
  queryLoggedIn,
  queryOptionalLoggedIn,
  queryOptionalLoggedInNoArguments,
} from "../middleware/queryMiddleware";

export const userRouter = express.Router();

userRouter.post("/updateUser", queryLoggedIn(updateUser, userNamesSchema));

userRouter.get(
  "/getMyUserInfo",
  queryOptionalLoggedInNoArguments(getUserInfoIfLoggedIn),
);

userRouter.get(
  "/getUser/:userId",
  queryOptionalLoggedIn(getUser, userIdSchema),
);

userRouter.post("/setIsAuthor", queryLoggedIn(setIsAuthor, setIsAuthorSchema));

userRouter.post(
  "/handles",
  queryLoggedIn(createStudentHandleAccounts, createHandleSchema),
);
