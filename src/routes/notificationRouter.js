import { Router } from "express";
import mongoose from "mongoose";
import { ContactMessage } from "../models/ContactMessage.js";
import { ProjectReview } from "../models/ProjectReview.js";
import { sendSubmissionEmails } from "../services/submissionEmail.js";

export const adminNotificationRouter = Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const lookup = { contact: ContactMessage, review: ProjectReview };

adminNotificationRouter.get("/notifications", wrap(async (_req, res) => {
  const [unreadContacts, unreadReviews, contacts, reviews] = await Promise.all([
    ContactMessage.countDocuments({ adminSeenAt: null }),
    ProjectReview.countDocuments({ adminSeenAt: null }),
    ContactMessage.find().sort({ createdAt: -1 }).limit(15)
      .select("name email topic createdAt status adminSeenAt notificationStatus clientEmailStatus").lean(),
    ProjectReview.find().sort({ createdAt: -1 }).limit(15)
      .select("name email referenceNumber createdAt status adminSeenAt notificationStatus clientEmailStatus").lean(),
  ]);
  const items = [
    ...contacts.map(item => ({ ...item, type: "contact", href: "/admin/contact-messages" })),
    ...reviews.map(item => ({ ...item, type: "review", href: `/admin/project-reviews/${item._id}` })),
  ].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15);
  res.set("Cache-Control", "no-store");
  res.json({ unread: { contact: unreadContacts, review: unreadReviews, total: unreadContacts + unreadReviews }, items });
}));

adminNotificationRouter.patch("/notifications/:type/:id/read", wrap(async (req, res) => {
  const Model = lookup[req.params.type];
  if (!Model || !mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification" });
  }
  const record = await Model.findByIdAndUpdate(req.params.id,
    { $set: { adminSeenAt: new Date() } }, { new: true });
  if (!record) return res.status(404).json({ message: "Notification not found" });
  res.json({ read: true, id: record.id });
}));

// Admin can retry only recipients not marked as sent.
adminNotificationRouter.post("/notifications/:type/:id/retry-email", wrap(async (req, res) => {
  const Model = lookup[req.params.type];
  if (!Model || !mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification" });
  }
  const record = await Model.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Submission not found" });
  const delivery = await sendSubmissionEmails(req.params.type, record);
  res.json({ data: delivery });
}));
