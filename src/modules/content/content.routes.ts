import { Router } from "express";
import { sendError } from "../../utils/response";

export const contentRouter = Router();

contentRouter.post("/generate", (_req, res) => sendError(res, "Content generation endpoint scaffolded", 501));
