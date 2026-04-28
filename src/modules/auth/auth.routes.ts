import { Router } from "express";
import { AuthController } from "./auth.controller";
import { requireAuth } from "../../middleware/auth";

const authController = new AuthController();
export const authRouter = Router();

authRouter.post("/register", (req, res, next) => authController.register(req, res, next));
authRouter.post("/login", (req, res, next) => authController.login(req, res, next));
authRouter.post("/refresh", (req, res, next) => authController.refresh(req, res, next));
authRouter.post("/logout", (req, res, next) => authController.logout(req, res, next));
authRouter.get("/me", requireAuth, (req, res, next) => authController.getMe(req, res, next));
