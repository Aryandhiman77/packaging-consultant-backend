import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";

export const reviewUploadDir = path.resolve(
  process.env.PRIVATE_UPLOAD_DIR || "./private-uploads/project-reviews",
);

mkdirSync(reviewUploadDir, {
  recursive: true,
});

const allowedFiles = new Map([
  [".pdf", ["application/pdf"]],
  [".png", ["image/png"]],
  [".jpg", ["image/jpeg", "image/jpg"]],
  [".jpeg", ["image/jpeg", "image/jpg"]],
  [".webp", ["image/webp"]],
  [".gif", ["image/gif"]],
  [".bmp", ["image/bmp", "image/x-ms-bmp"]],
  [".tif", ["image/tiff"]],
  [".tiff", ["image/tiff"]],
  [".heic", ["image/heic", "image/heif", "application/octet-stream"]],
  [".heif", ["image/heif", "image/heic", "application/octet-stream"]],
  [".mp4", ["video/mp4", "application/mp4"]],
  [".mov", ["video/quicktime", "video/mov", "application/octet-stream"]],
  [".m4v", ["video/x-m4v", "video/mp4"]],
  [".webm", ["video/webm"]],
  [".mpeg", ["video/mpeg"]],
  [".mpg", ["video/mpeg"]],
  [".avi", ["video/x-msvideo", "video/avi"]],
  [
    ".docx",
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ],
  [
    ".xlsx",
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ],
]);

export const MAX_REVIEW_FILES = 30;
export const MAX_REVIEW_FILE_SIZE = 20 * 1024 * 1024;

export function isAllowedReviewFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return Boolean(allowedFiles.get(extension)?.includes(file.mimetype));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, done) => {
      done(null, reviewUploadDir);
    },

    filename: (_request, file, done) => {
      const ext = path.extname(file.originalname).toLowerCase();

      done(null, `${randomUUID()}${ext}`);
    },
  }),

  fileFilter: (_request, file, done) => {
    if (!isAllowedReviewFile(file)) {
      const error = new Error("Unsupported file type");
      error.status = 400;
      return done(error);
    }

    done(null, true);
  },

  limits: {
    files: MAX_REVIEW_FILES,
    fileSize: MAX_REVIEW_FILE_SIZE,
    fieldSize: 128 * 1024,
    fields: 1,
    parts: MAX_REVIEW_FILES + 1,
  },
}).array("files", MAX_REVIEW_FILES);

// Delete uploaded files after a failed request.
export async function cleanupUploadedFiles(files = []) {
  await Promise.allSettled(files.map((file) => unlink(file.path)));
}

// Multer middleware.
export function uploadProjectReview(request, response, next) {
  upload(request, response, async (error) => {
    if (!error) return next();

    await cleanupUploadedFiles(request.files);

    if (error.code === "LIMIT_FILE_SIZE") {
      error.status = 413;
      error.message = "Each attachment must be 20 MB or smaller";
    } else if (
      error.code === "LIMIT_FILE_COUNT" ||
      error.code === "LIMIT_PART_COUNT" ||
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      error.status = 400;
      error.message = "A maximum of 30 attachments is allowed";
    } else {
      error.status = error.status || 400;
    }

    next(error);
  });
}

// Parse the review JSON sent in FormData.
export async function parseProjectReview(request, response, next) {
  try {
    const raw = request.body?.review;

    const review = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!review || Array.isArray(review) || typeof review !== "object") {
      throw new Error("review must be a JSON object");
    }

    request.body = { review };

    next();
  } catch {
    await cleanupUploadedFiles(request.files);

    response.status(400).json({
      message: "Invalid review JSON",
    });
  }
}
