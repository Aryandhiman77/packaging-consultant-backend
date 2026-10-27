import { verifyAdminToken } from "../utils/adminJwt.js";

export function requireAdmin(request, response, next) {
  // Fail closed if JWT secret is missing.
  if (!/^(?:[0-9a-f]{2}){32,}$/i.test(process.env.JWT_SECRET || "")) {
    return response.status(503).json({
      message: "Admin JWT authentication is not configured",
    });
  }

  const authorization = request.get("authorization") || "";

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);

  if (!match) {
    return response.status(401).json({
      message: "Bearer token is required",
    });
  }

  try {
    const claims = verifyAdminToken(match[1]);

    request.admin = {
      id: claims.sub,
      email: claims.email || "",
      role: claims.role,
      tokenId: claims.jti,
      issuedAt: claims.iat,
      expiresAt: claims.exp,
    };

    next();
  } catch (error) {
    return response.status(401).json({
      message:
        error.name === "TokenExpiredError"
          ? "Token expired. Request a new 24-hour token."
          : "Invalid admin token",
    });
  }
}
