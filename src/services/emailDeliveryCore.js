// Isolated delivery workflow so each recipient's status can be tested without SMTP or MongoDB.
export async function deliverSubmission({ record, messages, adminEmail, from, sendMail, updateRecord }) {
  const recipients = [
    { key: "admin", address: adminEmail, state: "notificationStatus", error: "notificationError", date: "notifiedAt" },
    { key: "client", address: record.email, state: "clientEmailStatus", error: "clientEmailError", date: "clientEmailedAt" },
  ];
  const result = {};
  for (const recipient of recipients) {
    const { key, address, state, error, date } = recipient;
    if (record[state] === "sent") {
      result[key] = { status: "sent", alreadySent: true };
      continue;
    }
    try {
      await sendMail({ from, to: address, ...messages[key] });
      await updateRecord({ [state]: "sent", [error]: "", [date]: new Date() });
      record[state] = "sent";
      result[key] = { status: "sent" };
    } catch (deliveryError) {
      const reason = String(deliveryError.message || "Mail delivery failed").slice(0, 500);
      console.error(`${key} email failure:`, reason);
      try { await updateRecord({ [state]: "failed", [error]: reason }); }
      catch (dbError) { console.error("Could not save email failure status:", dbError.message); }
      record[state] = "failed";
      result[key] = { status: "failed" };
    }
  }
  return result;
}
