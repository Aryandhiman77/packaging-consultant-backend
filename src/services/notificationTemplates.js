// Pure helpers. No email credentials or private files are exposed to the frontend.
const safe = (value, maximum = 500) => String(value ?? "")
  .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
  .slice(0, maximum).trim();

export function adminEmailFromEnv(env = process.env) {
  const email = safe(env.ADMIN_EMAIL, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address (same as admin login)");
  }
  return email;
}

export function smtpConfig(env = process.env) {
  const from = safe(env.SMTP_FROM || env.SMTP_USER, 254);
  const ready = Boolean(env.SMTP_HOST && from);
  return { ready, from, host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === "true", user: env.SMTP_USER, pass: env.SMTP_PASS };
}

export function submissionMailContent(kind, record) {
  if (!["contact", "review"].includes(kind)) throw new Error("Unknown submission type");
  const isReview = kind === "review";
  const name = safe(record.name, 120);
  const email = safe(record.email, 254);
  const reference = isReview ? safe(record.referenceNumber, 60) : String(record._id);
  const type = isReview ? "Project Review" : "Contact Us";
  const lines = [
    `New ${type} submission`, `Reference: ${reference}`, `Name: ${name}`,
    `Client email: ${email}`, `Company: ${safe(record.company)}`,
    `Phone: ${safe(record.phone || record.telephone)}`,
    `Submitted: ${record.createdAt ? new Date(record.createdAt).toISOString() : "-"}`,
  ];
  if (isReview) {
    lines.push(`Uploaded files: ${record.attachments?.length || 0} (view securely in Admin > Project Reviews)`);
    lines.push("Review answers and attachments are available in the admin panel. Files are not attached to this email.");
  } else {
    lines.push(`Topic: ${safe(record.topic, 100)}`,
      `Response preferences: ${(record.responses || []).map(x => safe(x, 100)).join(", ")}`,
      `Preferred method: ${safe(record.contactMethod)}`,
      `City/state: ${safe(record.cityState)}`,
      "", "Message:", String(record.message || "").slice(0, 10000));
  }
  const clientText = [
    `Hello ${name},`, "",
    `Thank you for contacting Packaging Consultants USA. We received your ${type.toLowerCase()} submission.`,
    `Your reference number: ${reference}`,
    "Our team will review your request and get back to you. This is an automatic confirmation, not a contract or project approval.",
    "", "Packaging Consultants USA",
  ].join("\n");
  return {
    admin: { subject: `New ${type}: ${reference}`, text: lines.join("\n"), replyTo: email },
    client: { subject: `We received your ${type} | ${reference}`, text: clientText },
  };
}
