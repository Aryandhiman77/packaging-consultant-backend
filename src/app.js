import cors from "cors";
import express from "express";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import { requireAdmin } from "./middleware/requireAdmin.js";
import { adminNotificationRouter } from "./routes/notificationRouter.js";

import { adminRouter } from "./routes/adminRouter.js";
import { adminAuthRouter } from "./routes/adminAuthRouter.js";

import { publicRouter } from "./routes/publicRouter.js";

import {
  publicProjectReviewRouter,
  adminProjectReviewRouter,
} from "./routes/projectReviewRouter.js";

import {publicContentRouter, adminContentRouter} from "./routes/contentRouter.js";

import {publicBlogRouter,adminBlogRouter} from './routes/blogRouter.js';

import {publicMediaRouter,adminMediaRouter} from "./routes/mediaRouter.js";

export function createApp() {
  const app = express();

  const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(
    express.json({
      limit: "1mb",
    }),
  );

  // PUBLIC
  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "packaging-consultant-api",
    });
  });

  app.use("/api", publicRouter);
  app.use("/api", publicContentRouter);
  app.use("/api", publicBlogRouter);
  app.use("/api", publicMediaRouter);

  app.use("/api/project-reviews", publicProjectReviewRouter);

  // Public login endpoint; all other admin endpoints remain protected.
  app.use("/api/admin/auth", adminAuthRouter);

  // All /api/admin routes require a valid JWT.
  app.use("/api/admin", requireAdmin);

  app.use("/api/admin/project-reviews", adminProjectReviewRouter);
  app.use("/api/admin", adminNotificationRouter);

  app.use("/api/admin", adminContentRouter);
  app.use("/api/admin", adminBlogRouter);
  app.use("/api/admin", adminMediaRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
