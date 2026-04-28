import { webhookCallback } from "grammy";
import { Router } from "express";
import { bot } from "./bot";

export const botRouter = Router();

botRouter.post("/webhook", webhookCallback(bot, "express"));
