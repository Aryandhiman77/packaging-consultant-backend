import { Admin } from "../models/Admin.js";
import { issueAdminToken, verifyAdminToken } from "../utils/adminJwt.js";
import { verifyPassword } from "../utils/password.js";

export async function loginAdmin(request, response) {
  const email = String(request.body?.email || "").trim().toLowerCase();
  const password = String(request.body?.password || "");

  if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
    return response.status(400).json({
      message: "Enter a valid email address and password",
    });
  }

  const admin = await Admin.findOne({ key: "primary", active: true })
    .select("+passwordHash");

  const passwordMatches = admin
    ? await verifyPassword(password, admin.passwordHash)
    : false;

  if (!admin || admin.email !== email || !passwordMatches) {
    return response.status(401).json({
      message: "Incorrect email address or password",
    });
  }

  const token = issueAdminToken(admin);
  const claims = verifyAdminToken(token);

  response.setHeader("Cache-Control", "no-store");
  return response.json({
    token,
    expiresAt: claims.exp,
    admin: {
      email: admin.email,
      role: admin.role,
    },
  });
}
