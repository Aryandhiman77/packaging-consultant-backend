import { Admin } from "../models/Admin.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

function adminCredentialsFromEnv() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("ADMIN_EMAIL must contain a valid email address");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
  }

  return { email, password };
}

// Runs once whenever the API starts. The environment is the source of truth:
// changing ADMIN_EMAIL or ADMIN_PASSWORD updates the single database admin.
export async function syncEnvAdmin() {
  const { email, password } = adminCredentialsFromEnv();
  const current = await Admin.findOne({ key: "primary" }).select("+passwordHash");

  const credentialsMatch = current
    ? current.email === email && await verifyPassword(password, current.passwordHash)
    : false;

  if (credentialsMatch && current.active && current.role === "admin") {
    return current;
  }

  const passwordHash = credentialsMatch
    ? current.passwordHash
    : await hashPassword(password);

  return Admin.findOneAndUpdate(
    { key: "primary" },
    {
      $set: {
        email,
        passwordHash,
        role: "admin",
        active: true,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}
