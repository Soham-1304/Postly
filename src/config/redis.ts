import Redis from 'ioredis';
import { env } from './env';

/**
 * Redis connection for BullMQ queue (Redis Cloud)
 */
export function createRedisConnection() {
  return new Redis(env.REDIS_URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

/**
 * Global Redis connection for caching and general ops
 */
export const redis = createRedisConnection();

// Event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected (Redis Cloud)');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

export default redis;
