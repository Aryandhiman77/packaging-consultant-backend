import Joi from "joi";
import { reviewFieldDefinitions } from "../data/projectReviewFields.js";
import { REVIEW_STATUSES } from "../models/ProjectReview.js";

export const contactKeys = {
  name: "contact-submission:Contact information:Name",
  email: "contact-submission:Contact information:Email",
  company: "contact-submission:Contact information:Company, if applicable",
  phone:
    "contact-submission:Contact information:Telephone, if a call is requested",
};

export const newsletterLabel = "Send me Packaging Times news and updates.";
export const legacyNewsletterKey = `contact-submission:acknowledgements:${newsletterLabel}`;
export const newsletterKey = `contact-submission:marketingOptIn:${newsletterLabel}`;
export const legacyProductFormKey =
  "product-marketplace:Product to Package:Product form: dry, liquid, powder, solid, refrigerated, frozen or other";

const productForms = [
  "Dry",
  "Liquid",
  "Powder",
  "Solid",
  "Refrigerated",
  "Frozen",
];

const answerShape = {
  uploadedFiles: Joi.array().items(Joi.string().max(255)).max(30).optional(),
  [legacyProductFormKey]: Joi.string()
    .trim()
    .max(2000)
    .custom((value, helpers) => {
      if (productForms.includes(value) || /^Other:\s*\S.+$/i.test(value)) {
        return value;
      }
      return helpers.error("any.invalid");
    })
    .optional(),
};

// Build Joi rules for all 7 steps.
for (const step of reviewFieldDefinitions) {
  for (const group of step.groups) {
    if (group.type === "radio") {
      answerShape[group.name] = Joi.string()
        .valid(...group.options)
        .optional();
    }

    if (group.type === "checkbox") {
      for (const option of group.options) {
        const key = `${step.slug}:${group.name}:${option}`;

        answerShape[key] = Joi.boolean().strict().optional();
      }
    }

    if (group.type === "text" || group.type === "contact") {
      for (const label of group.fields) {
        const key = `${step.slug}:${group.heading}:${label}`;

        answerShape[key] = Joi.string().trim().allow("").max(2000).optional();
      }

      if (group.embeddedRadio) {
        const field = group.embeddedRadio;
        answerShape[field.name] = Joi.string()
          .valid(...field.options)
          .optional();

        if (field.otherField) {
          answerShape[field.otherField.name] = Joi.when(field.name, {
            is: field.otherField.trigger,
            then: Joi.string().trim().min(1).max(2000).required(),
            otherwise: Joi.string().trim().allow("").max(2000).optional(),
          });
        }
      }
    }
  }
}

// Required contact details.
answerShape[contactKeys.name] = Joi.string().trim().min(2).max(120).required();

answerShape[contactKeys.email] = Joi.string()
  .trim()
  .email({ tlds: { allow: false } })
  .max(254)
  .required();

// All required acknowledgements must be TRUE.
const contactStep = reviewFieldDefinitions.find(
  (step) => step.slug === "contact-submission",
);

const acknowledgements = contactStep.groups.find(
  (group) => group.name === "acknowledgements",
);

for (const label of acknowledgements.options) {
  const key = `contact-submission:acknowledgements:${label}`;

  answerShape[key] = Joi.boolean().strict().valid(true).required();
}

// Backward compatibility for drafts saved before the newsletter opt-in was
// separated from the required acknowledgement group.
answerShape[legacyNewsletterKey] = Joi.boolean().strict().optional();

// Customer submission.
export const projectReviewSubmissionSchema = Joi.object({
  review: Joi.object(answerShape).unknown(false).required(),
}).unknown(false);

// Admin list, search, pagination, status filter.
export const listProjectReviewsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),

  limit: Joi.number().integer().min(1).max(100).default(10),

  status: Joi.string().valid(...REVIEW_STATUSES),

  search: Joi.string().trim().max(100).allow(""),
}).unknown(false);

// Validate MongoDB ObjectId.
export const projectReviewIdSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
}).unknown(false);

// Validate file download params.
export const reviewFileParamsSchema = projectReviewIdSchema.keys({
  fileId: Joi.string().guid({ version: "uuidv4" }).required(),
});

// Admin can update only status and notes.
export const updateProjectReviewSchema = Joi.object({
  status: Joi.string().valid(...REVIEW_STATUSES),

  adminNotes: Joi.string().allow("").max(5000),
})
  .min(1)
  .unknown(false);
