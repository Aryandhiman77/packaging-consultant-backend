import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { assertBlogBannerSize } from "../utils/jpegSize.js";

const storageDir = path.resolve(process.cwd(), "uploads", "content");

const extFor = (buffer) => {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return ".jpg";
  }

  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return ".png";
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }

  if (["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) {
    return ".gif";
  }

  return null;
};

export const adminMediaRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
  },

  fileFilter: (req, file, callback) => {
    callback(
      null,
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.mimetype,
      ),
    );
  },
}).single("upload");

// CKEditor body image upload
adminMediaRouter.post("/media", (req, res, next) =>
  upload(req, res, async (err) => {
    if (err) {
      return res
        .status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400)
        .json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "One JPG, PNG, GIF or WEBP image is required (max 10 MB).",
      });
    }

    const ext = extFor(req.file.buffer);

    if (!ext) {
      return res.status(400).json({
        message: "Invalid image file signature.",
      });
    }

    try {
      await fs.mkdir(storageDir, {
        recursive: true,
      });

      const name = `${randomUUID()}${ext}`;

      await fs.writeFile(path.join(storageDir, name), req.file.buffer, {
        flag: "wx",
      });

      res.status(201).json({
        url: `/api/media/${name}`,
      });
    } catch (error) {
      next(error);
    }
  }),
);

// Banner: JPEG only, 1200 x 630
const uploadBanner = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
  },

  fileFilter: (req, file, callback) =>
    callback(null, file.mimetype === "image/jpeg"),
}).single("upload");

adminMediaRouter.post("/media/blog-banner", (req, res, next) =>
  uploadBanner(req, res, async (err) => {
    if (err) {
      return res
        .status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400)
        .json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Upload one cropped JPG banner, 1200 × 630 px, max 10 MB.",
      });
    }

    try {
      assertBlogBannerSize(req.file.buffer);

      await fs.mkdir(storageDir, {
        recursive: true,
      });

      const name = `${randomUUID()}.jpg`;

      await fs.writeFile(path.join(storageDir, name), req.file.buffer, {
        flag: "wx",
      });

      return res.status(201).json({
        url: `/api/media/${name}`,
        width: 1200,
        height: 630,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }

      return res.status(422).json({
        message: error.message || "Invalid cropped image.",
      });
    }
  }),
);

export const publicMediaRouter = Router();

publicMediaRouter.get("/media/:name", async (req, res, next) => {
  if (!/^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/.test(req.params.name)) {
    return res.status(404).end();
  }

  res.setHeader("Cache-Control", "public, max-age=86400");

  res.setHeader("X-Content-Type-Options", "nosniff");

  res.sendFile(path.join(storageDir, req.params.name), (err) => {
    if (err && !res.headersSent) {
      next(err);
    }
  });
});
