import { Router } from "express";
import { sendError } from "../../utils/response";

export const authRouter = Router();

authRouter.post("/register", (_req, res) => sendError(res, "Auth register endpoint scaffolded", 501));
authRouter.post("/login", (_req, res) => sendError(res, "Auth login endpoint scaffolded", 501));
authRouter.post("/refresh", (_req, res) => sendError(res, "Auth refresh endpoint scaffolded", 501));
authRouter.post("/logout", (_req, res) => sendError(res, "Auth logout endpoint scaffolded", 501));
authRouter.get("/me", (_req, res) => sendError(res, "Auth me endpoint scaffolded", 501));
