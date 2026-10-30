import { Router } from "express";
import Joi from "joi";
import fs from "node:fs/promises";
import path from "node:path";

import { BlogPost } from "../models/BlogPost.js";

import { assertBlogBannerSize } from "../utils/jpegSize.js";

import { sanitizeRichHtml } from "./contentRouter.js";

const wrap = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const schema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),

  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150)
    .required(),

  excerpt: Joi.string().allow("").max(600).default(""),

  bannerImage: Joi.string()
    .allow("")
    .pattern(/^\/api\/media\/[0-9a-f-]{36}\.jpg$/)
    .default(""),

  bannerAlt: Joi.string().allow("").max(200).default(""),

  html: Joi.string().min(1).max(200000).required(),

  metaTitle: Joi.string().trim().min(1).max(180).required(),

  metaDescription: Joi.string().trim().min(1).max(320).required(),

  status: Joi.string().valid("draft", "published").required(),
}).options({
  stripUnknown: true,
  abortEarly: false,
});

function validate(req) {
  const { error, value } = schema.validate(req.body);

  if (error) {
    const err = new Error(error.details.map((item) => item.message).join("; "));

    err.status = 400;
    throw err;
  }

  return {
    ...value,
    html: sanitizeRichHtml(value.html),
  };
}

async function validateBanner(data) {
  if (data.status === "published" && !data.bannerImage) {
    const error = new Error("A cropped banner is required before publishing.");

    error.status = 400;
    throw error;
  }

  if (!data.bannerImage) return;

  const filename = data.bannerImage.slice("/api/media/".length);

  try {
    const bytes = await fs.readFile(
      path.resolve(process.cwd(), "uploads", "content", filename),
    );

    assertBlogBannerSize(bytes);
  } catch {
    const error = new Error(
      "Blog banner is missing or not 1200 × 630 pixels. Please crop and upload again.",
    );

    error.status = 400;
    throw error;
  }
}

function safeSlug(req) {
  const { slug } = req.params;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    const error = new Error("Invalid blog slug");
    error.status = 400;
    throw error;
  }

  return slug;
}

function safeId(req) {
  const { id } = req.params;

  if (!/^[0-9a-f]{24}$/i.test(id)) {
    const error = new Error("Invalid blog ID");
    error.status = 400;
    throw error;
  }

  return id;
}

function notFound(res) {
  return res.status(404).json({
    message: "Blog post not found",
  });
}

// PUBLIC BLOG ROUTES
export const publicBlogRouter = Router();

publicBlogRouter.get(
  "/blog",
  wrap(async (req, res) => {
    const page = Math.max(
      1,
      Math.min(10000, Number.parseInt(req.query.page, 10) || 1),
    );

    const limit = 12;
    const query = { status: "published" };

    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .sort({
          publishedAt: -1,
          createdAt: -1,
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "title slug excerpt bannerImage bannerAlt metaTitle metaDescription publishedAt createdAt",
        ),

      BlogPost.countDocuments(query),
    ]);

    res.set("Cache-Control", "no-store");

    res.json({
      data: posts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }),
);

publicBlogRouter.get(
  "/blog/:slug",
  wrap(async (req, res) => {
    const post = await BlogPost.findOne({
      slug: safeSlug(req),
      status: "published",
    });

    if (!post) return notFound(res);

    res.set("Cache-Control", "no-store");
    res.json({ data: post });
  }),
);

// ADMIN BLOG ROUTES
export const adminBlogRouter = Router();

adminBlogRouter.get(
  "/blogs",
  wrap(async (req, res) => {
    const data = await BlogPost.find()
      .sort({ updatedAt: -1 })
      .select(
        "title slug excerpt bannerImage bannerAlt status metaTitle metaDescription updatedAt publishedAt",
      );

    res.set("Cache-Control", "no-store");
    res.json({ data });
  }),
);

adminBlogRouter.get(
  "/blogs/:id",
  wrap(async (req, res) => {
    const doc = await BlogPost.findById(safeId(req));

    if (!doc) return notFound(res);

    res.json({ data: doc });
  }),
);

adminBlogRouter.post(
  "/blogs",
  wrap(async (req, res) => {
    const data = validate(req);

    await validateBanner(data);

    if (data.status === "published") {
      data.publishedAt = new Date();
    }

    const existing = await BlogPost.findOne({
      slug: data.slug,
    });

    if (existing) {
      return res.status(409).json({
        message: "A blog post already uses this URL slug.",
      });
    }

    const doc = await BlogPost.create(data);

    res.status(201).json({ data: doc });
  }),
);

adminBlogRouter.patch(
  "/blogs/:id",
  wrap(async (req, res) => {
    const data = validate(req);

    await validateBanner(data);

    const doc = await BlogPost.findById(safeId(req));

    if (!doc) return notFound(res);

    const duplicate = await BlogPost.findOne({
      slug: data.slug,
      _id: { $ne: doc._id },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "A blog post already uses this URL slug.",
      });
    }

    if (data.status === "published" && !doc.publishedAt) {
      data.publishedAt = new Date();
    }

    if (data.status === "draft") {
      data.publishedAt = null;
    }

    doc.set(data);
    await doc.save();

    res.json({ data: doc });
  }),
);

adminBlogRouter.delete(
  "/blogs/:id",
  wrap(async (req, res) => {
    const doc = await BlogPost.findByIdAndDelete(safeId(req));

    if (!doc) return notFound(res);

    res.json({ deleted: true });
  }),
);
