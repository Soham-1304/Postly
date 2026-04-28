import { Worker } from "bullmq";
import { redis } from "../../config/redis";
import type { PublishJob } from "./queue";

export const publishWorker = new Worker<PublishJob>(
  "platform-publish",
  async (job) => {
    console.log(`Scaffold worker received ${job.data.platform} job for post ${job.data.postId}`);
  },
  { connection: redis }
);

publishWorker.on("failed", (job, error) => {
  console.error(`Publish job ${job?.id ?? "unknown"} failed`, error);
});
