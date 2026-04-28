import { Router } from "express";
import { sendError } from "../../utils/response";

export const userRouter = Router();

userRouter.get("/profile", (_req, res) => sendError(res, "User profile endpoint scaffolded", 501));
userRouter.put("/profile", (_req, res) => sendError(res, "User profile update endpoint scaffolded", 501));
userRouter.post("/social-accounts", (_req, res) => sendError(res, "Add social account endpoint scaffolded", 501));
userRouter.get("/social-accounts", (_req, res) => sendError(res, "List social accounts endpoint scaffolded", 501));
userRouter.delete("/social-accounts/:id", (_req, res) => sendError(res, "Delete social account endpoint scaffolded", 501));
userRouter.put("/ai-keys", (_req, res) => sendError(res, "AI keys endpoint scaffolded", 501));
