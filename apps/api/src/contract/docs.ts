import express, { Router } from "express";
import swaggerUi from "swagger-ui-express";
import type { OpenApiDocument } from "./openapiTypes";

/**
 * Serve the contract (mounted at `/api`):
 * - `/api/openapi.json`: the OpenAPI document
 * - `/api/docs`: Swagger UI for it
 */
export function contractDocsRouter(spec: OpenApiDocument): Router {
  const router = express.Router();
  router.get("/openapi.json", (_req, res) => {
    res.json(spec);
  });
  router.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: "Doenet API",
      swaggerOptions: { url: "/api/openapi.json" },
    }),
  );
  return router;
}
