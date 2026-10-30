import { randomUUID } from "node:crypto";
import path from "node:path";
import { ProjectReview } from "../models/ProjectReview.js";
import { sendProjectReviewNotification } from "../services/submissionEmail.js";
import {
  contactKeys,
  legacyProductFormKey,
  legacyNewsletterKey,
  newsletterKey,
} from "../validations/projectReviewSchema.js";
import {
  cleanupUploadedFiles,
  reviewUploadDir,
} from "../middleware/uploadProjectReview.js";

const text = (value) => (typeof value === "string" ? value.trim() : "");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function normalizeReviewAnswers(review) {
  const normalized = { ...review };

  if (
    normalized[legacyNewsletterKey] !== undefined &&
    normalized[newsletterKey] === undefined
  ) {
    normalized[newsletterKey] = Boolean(normalized[legacyNewsletterKey]);
  }

  delete normalized[legacyNewsletterKey];

  if (
    normalized[legacyProductFormKey] !== undefined &&
    normalized.productForm === undefined
  ) {
    const legacyProductForm = text(normalized[legacyProductFormKey]);
    const other = legacyProductForm.match(/^Other:\s*(.+)$/i);

    normalized.productForm = other ? "Other" : legacyProductForm;
    if (other) normalized.productFormOther = other[1].trim();
  }

  delete normalized[legacyProductFormKey];
  return normalized;
}

// Return readable answers without private disk filenames.
function safeReview(record) {
  return {
    ...record,

    answers: Object.fromEntries(
      record.answers.map(({ key, value }) => [key, value]),
    ),

    attachments: record.attachments.map(
      ({ filename: _privateName, ...file }) => file,
    ),
  };
}

// POST /api/project-reviews
export async function submitProjectReview(request, response) {
  const review = normalizeReviewAnswers(request.body.review);
  const files = request.files || [];

  try {
    const referenceNumber = `PR-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const record = await ProjectReview.create({
      referenceNumber,

      name: text(review[contactKeys.name]),

      email: text(review[contactKeys.email]).toLowerCase(),

      company: text(review[contactKeys.company]),

      phone: text(review[contactKeys.phone]),

      answers: Object.entries(review)
        .filter(([key]) => key !== "uploadedFiles")
        .map(([key, value]) => ({
          key,
          value,
        })),

      attachments: files.map((file) => ({
        fileId: path.parse(file.filename).name,

        originalName: file.originalname.slice(0, 255),

        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      })),
    });

    // DB save is the source of truth: SMTP failures never discard the review.
    let delivery = { admin: {status: "pending"}, client: {status: "pending"} };
    try {
      delivery = await sendProjectReviewNotification(record);
    } catch (mailError) {
      console.error("Project Review saved but email delivery failed:", mailError.message);
    }

    return response.status(201).json({
      message: "Project Review received",
      referenceNumber: record.referenceNumber,
      submissionDate: record.createdAt,
      emailDelivery: { admin: delivery.admin.status, client: delivery.client.status },
    });
  } catch (error) {
    await cleanupUploadedFiles(files);
    throw error;
  }
}

// GET /api/admin/project-reviews
export async function listProjectReviews(request, response) {
  const { page, limit, status, search } = request.validatedQuery;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");

    filter.$or = [
      { name: regex },
      { email: regex },
      { referenceNumber: regex },
    ];
  }

  const [reviews, total] = await Promise.all([
    ProjectReview.find(filter)
      .select("referenceNumber name email company status createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    ProjectReview.countDocuments(filter),
  ]);

  return response.json({
    data: reviews,

    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// GET /api/admin/project-reviews/:id
export async function getProjectReview(request, response) {
  const review = await ProjectReview.findById(request.params.id).lean();

  if (!review) {
    return response.status(404).json({
      message: "Project Review not found",
    });
  }

  return response.json({
    data: safeReview(review),
  });
}

// PATCH /api/admin/project-reviews/:id
export async function updateProjectReview(request, response) {
  const review = await ProjectReview.findByIdAndUpdate(
    request.params.id,
    { $set: request.body },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!review) {
    return response.status(404).json({
      message: "Project Review not found",
    });
  }

  return response.json({
    data: safeReview(review),
  });
}

// GET /api/admin/project-reviews/:id/files/:fileId
export async function downloadProjectReviewFile(request, response, next) {
  const review = await ProjectReview.findById(request.params.id).lean();

  if (!review) {
    return response.status(404).json({
      message: "Project Review not found",
    });
  }

  const file = review.attachments.find(
    (item) => item.fileId === request.params.fileId,
  );

  if (!file) {
    return response.status(404).json({
      message: "File not found",
    });
  }

  response.setHeader("Cache-Control", "private, no-store");

  response.setHeader("X-Content-Type-Options", "nosniff");

  response.download(
    path.join(reviewUploadDir, path.basename(file.filename)),
    file.originalName,
    (error) => {
      if (error && !response.headersSent) {
        next(error);
      }
    },
  );
}
