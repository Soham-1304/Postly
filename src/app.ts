import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./modules/auth/auth.routes";
import { botRouter } from "./modules/bot/bot.routes";
import { contentRouter } from "./modules/content/content.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { postsRouter } from "./modules/posts/posts.routes";
import { userRouter } from "./modules/user/user.routes";
import { errorHandler } from "./middleware/errorHandler";
import { sendSuccess } from "./utils/response";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/content", contentRouter);
app.use("/api/posts", postsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/bot", botRouter);

app.use(errorHandler);
