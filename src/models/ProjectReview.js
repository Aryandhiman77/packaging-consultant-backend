import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      maxlength: 250,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const attachmentSchema = new mongoose.Schema(
  {
    fileId: { type: String, required: true },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

export const REVIEW_STATUSES = [
  "new",
  "in_review",
  "waiting_for_client",
  "completed",
  "closed",
];

const projectReviewSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    company: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "new",
    },

    adminNotes: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    // Email status for each recipient (existing records default to pending).
    notificationStatus: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    notificationError: { type: String, default: "" },
    notifiedAt: Date,
    clientEmailStatus: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    clientEmailError: { type: String, default: "" },
    clientEmailedAt: Date,
    adminSeenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

projectReviewSchema.index({ createdAt: -1 });
projectReviewSchema.index({ status: 1, createdAt: -1 });
projectReviewSchema.index({ email: 1, createdAt: -1 });

export const ProjectReview = mongoose.model(
  "ProjectReview",
  projectReviewSchema,
);
