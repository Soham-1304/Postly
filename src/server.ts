import { app } from "./app";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { publishWorker } from "./modules/queue/worker";

async function start() {
  try {
    // Test Redis connection
    await redis.ping();
    console.log("Redis connected successfully");

    // Wait for BullMQ worker to confirm it is ready
    await publishWorker.waitUntilReady();
    console.log(`BullMQ worker READY — listening on queue: ${publishWorker.name}`);

    // Start Express server
    app.listen(env.PORT, () => {
      console.log(`Postly API listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
