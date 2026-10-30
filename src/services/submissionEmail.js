import nodemailer from "nodemailer";
import { adminEmailFromEnv, smtpConfig, submissionMailContent } from "./notificationTemplates.js";
import { deliverSubmission } from "./emailDeliveryCore.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { ProjectReview } from "../models/ProjectReview.js";

// Each recipient has independent status. A retry NEVER sends again to a recipient marked sent.
export async function sendSubmissionEmails(kind, doc) {
  const Model = kind === "contact" ? ContactMessage : kind === "review" ? ProjectReview : null;
  if (!Model) throw new Error("Unknown notification type");

  const result = {
    admin: { status: doc.notificationStatus || "pending" },
    client: { status: doc.clientEmailStatus || "pending" },
  };

  let config;
  let adminEmail;
  try {
    config = smtpConfig();
    adminEmail = adminEmailFromEnv();
  } catch (error) {
    console.error("Email notification config:", error.message);
    return result;
  }
  if (!config.ready) {
    console.warn("Emails pending: configure SMTP_HOST and SMTP_FROM (or SMTP_USER) in backend .env");
    return result;
  }

  const templates = submissionMailContent(kind, doc);
  const mailer = nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.secure,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    ...(config.user ? { auth: { user: config.user, pass: config.pass } } : {}),
  });

  try {
    return await deliverSubmission({
      record: doc,
      messages: templates,
      adminEmail,
      from: config.from,
      sendMail: (mail) => mailer.sendMail(mail),
      updateRecord: (changes) => Model.updateOne({ _id: doc._id }, { $set: changes }),
    });
  } finally {
    mailer.close();
  }
}

export const sendContactNotification = (doc) => sendSubmissionEmails("contact", doc);
export const sendProjectReviewNotification = (doc) => sendSubmissionEmails("review", doc);
