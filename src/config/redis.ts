import Redis from 'ioredis';
import { env } from './env';

/**
 * Upstash Redis connection for BullMQ queue
 */
export const redis = new Redis(env.REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected (Upstash)');
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
