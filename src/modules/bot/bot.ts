import { Bot } from "grammy";
import { env } from "../../config/env";

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.command("help", (ctx) =>
  ctx.reply("Commands: /post to create content, /status for recent posts, /accounts for connected accounts.")
);
