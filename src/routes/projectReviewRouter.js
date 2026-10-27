import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  submitProjectReview,
  listProjectReviews,
  getProjectReview,
  updateProjectReview,
  downloadProjectReviewFile,
} from "../controllers/projectReviewController.js";

import {
  projectReviewSubmissionSchema,
  listProjectReviewsSchema,
  projectReviewIdSchema,
  reviewFileParamsSchema,
  updateProjectReviewSchema,
} from "../validations/projectReviewSchema.js";



import { validate } from "../middleware/validate.js";

import {
  uploadProjectReview,
  parseProjectReview,
} from "../middleware/uploadProjectReview.js";

export const publicProjectReviewRouter = Router();
export const adminProjectReviewRouter = Router();

const submissionLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many submissions. Please try again later.",
  },
});

// PUBLIC: Submit a new Project Review.
publicProjectReviewRouter.post(
  "/",
  submissionLimit,
  uploadProjectReview,
  parseProjectReview,
  validate(projectReviewSubmissionSchema),
  submitProjectReview,
);



// List with pagination, search and filters.
adminProjectReviewRouter.get(
  "/",
  validate(listProjectReviewsSchema, "query"),
  listProjectReviews,
);

// Full review details.
adminProjectReviewRouter.get(
  "/:id",
  validate(projectReviewIdSchema, "params"),
  getProjectReview,
);

// Update status / admin notes.
adminProjectReviewRouter.patch(
  "/:id",
  validate(projectReviewIdSchema, "params"),
  validate(updateProjectReviewSchema),
  updateProjectReview,
);

// Download private file.
adminProjectReviewRouter.get(
  "/:id/files/:fileId",
  validate(reviewFileParamsSchema, "params"),
  downloadProjectReviewFile,
);
