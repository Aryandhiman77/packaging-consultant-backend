import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    excerpt: {
      type: String,
      default: "",
      maxlength: 600,
    },

    bannerImage: {
      type: String,
      default: "",
      maxlength: 130,
    },

    bannerAlt: {
      type: String,
      default: "",
      maxlength: 200,
    },

    html: {
      type: String,
      required: true,
      maxlength: 200000,
    },

    metaTitle: {
      type: String,
      required: true,
      maxlength: 180,
    },

    metaDescription: {
      type: String,
      required: true,
      maxlength: 320,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schema.index({
  status: 1,
  publishedAt: -1,
});

export const BlogPost = mongoose.model(
  "BlogPost",
  schema
);