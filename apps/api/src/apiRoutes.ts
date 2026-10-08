import { Express } from "express";
import { contractDocsRouter, operationsRouter } from "./contract";
import { apiOperations, apiSpec } from "./apiOperations";
import { userRouter } from "./routes/userRoutes";
import { loginRouter } from "./routes/loginRoutes";
import { updateContentRouter } from "./routes/updateContentRoutes";
import { shareRouter } from "./routes/shareRoutes";
import { scoreRouter } from "./routes/scoreRoutes";
import { classificationRouter } from "./routes/classificationRoutes";
import { activityEditViewRouter } from "./routes/activityEditViewRoutes";
import { exploreRouter } from "./routes/exploreRoutes";
import { remixRouter } from "./routes/remixRoutes";
import { contentListRouter } from "./routes/contentListRoutes";
import { infoRouter } from "./routes/infoRoutes";
import { copyMoveRouter } from "./routes/copyMoveRoutes";
import { testRouter } from "./test/testRoutes";
import { curateRouter } from "./routes/curateRoutes";
import { compareRouter } from "./routes/compareRoutes";
import { editorRouter } from "./routes/editorRoutes";
import { discourseRouter } from "./routes/discourseLoginRoutes";
import { codeRouter } from "./routes/code";
import { metricsRouter } from "./routes/metricsRoutes";
import { contentRouter } from "./routes/content.route";
import { mediaRouter } from "./media";

/** Mount every `/api` route on `app`. */
export function mountApiRoutes(
  app: Pick<Express, "use">,
  { enableTestRoutes }: { enableTestRoutes: boolean },
) {
  app.use("/api", contractDocsRouter(apiSpec));
  app.use("/api", operationsRouter(apiOperations));

  // Not yet in the contract. Bring a route into the contract before
  // changing its inputs or outputs.
  app.use("/api/user", userRouter);
  app.use("/api/login", loginRouter);
  app.use("/api/updateContent", updateContentRouter);
  app.use("/api/share", shareRouter);
  app.use("/api/score", scoreRouter);
  app.use("/api/classifications", classificationRouter);
  app.use("/api/activityEditView", activityEditViewRouter);
  app.use("/api/explore", exploreRouter);
  app.use("/api/remix", remixRouter);
  app.use("/api/contentList", contentListRouter);
  app.use("/api/info", infoRouter);
  app.use("/api/copyMove", copyMoveRouter);
  app.use("/api/curate", curateRouter);
  app.use("/api/compare", compareRouter);
  app.use("/api/editor", editorRouter);
  app.use("/api/code", codeRouter);
  app.use("/api/metrics", metricsRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/media", mediaRouter);

  // Discourse uses this endpoint to sign on
  app.use("/api/discourse", discourseRouter);

  if (enableTestRoutes) {
    app.use("/api/test", testRouter);
  }
}
