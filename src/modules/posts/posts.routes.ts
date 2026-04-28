import { Router } from "express";
import { sendError } from "../../utils/response";

export const postsRouter = Router();

postsRouter.post("/publish", (_req, res) => sendError(res, "Publish post endpoint scaffolded", 501));
postsRouter.post("/schedule", (_req, res) => sendError(res, "Schedule post endpoint scaffolded", 501));
postsRouter.get("/", (_req, res) => sendError(res, "List posts endpoint scaffolded", 501));
postsRouter.get("/:id", (_req, res) => sendError(res, "Post detail endpoint scaffolded", 501));
postsRouter.post("/:id/retry", (_req, res) => sendError(res, "Retry post endpoint scaffolded", 501));
postsRouter.delete("/:id", (_req, res) => sendError(res, "Cancel post endpoint scaffolded", 501));
