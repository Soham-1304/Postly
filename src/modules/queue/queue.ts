import { Queue } from "bullmq";
import { redis } from "../../config/redis";

export type PublishJob = {
  postId: string;
  platformPostId: string;
  platform: "twitter" | "linkedin" | "instagram" | "threads";
  content: string;
  userId: string;
};

export const publishQueue = new Queue<PublishJob>("platform-publish", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: 100
  }
});
