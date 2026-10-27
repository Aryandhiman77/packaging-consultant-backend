import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginAdmin } from "../controllers/adminAuthController.js";

export const adminAuthRouter = Router();

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please wait and try again.",
  },
});

adminAuthRouter.post("/login", loginLimit, loginAdmin);
