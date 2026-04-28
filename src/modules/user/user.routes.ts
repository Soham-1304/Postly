import { Router } from "express";
import { UserController } from "./user.controller";
import { requireAuth } from "../../middleware/auth";

const userController = new UserController();
export const userRouter = Router();

// All routes protected with requireAuth middleware

userRouter.get("/profile", requireAuth, (req, res, next) =>
  userController.getProfile(req, res, next)
);

userRouter.put("/profile", requireAuth, (req, res, next) =>
  userController.updateProfile(req, res, next)
);

userRouter.post("/social-accounts", requireAuth, (req, res, next) =>
  userController.addSocialAccount(req, res, next)
);

userRouter.get("/social-accounts", requireAuth, (req, res, next) =>
  userController.getSocialAccounts(req, res, next)
);

userRouter.delete("/social-accounts/:id", requireAuth, (req, res, next) =>
  userController.deleteSocialAccount(req, res, next)
);

userRouter.put("/ai-keys", requireAuth, (req, res, next) =>
  userController.updateAiKeys(req, res, next)
);
