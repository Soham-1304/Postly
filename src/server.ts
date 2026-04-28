import { app } from "./app";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { publishWorker } from "./modules/queue/worker";

async function start() {
  try {
    // Test Redis connection
    await redis.ping();
    console.log("✅ Redis ready for BullMQ");

    // Start BullMQ worker
    console.log("🚀 BullMQ worker started, listening on platform-publish queue");

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`Postly API listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
