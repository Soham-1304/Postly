import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { redis } from '../src/config/redis';
import { signAccessToken } from '../src/utils/jwt';

describe('Posts Endpoints', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Posts Tester',
        email: `posts-${Date.now()}@example.com`,
        passwordHash: 'hashed_password',
      },
    });
    userId = user.id;
    token = signAccessToken(userId, user.email);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('should create Post and PlatformPost records on publish', async () => {
    const response = await request(app)
      .post('/api/posts/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: 'Test idea',
        postType: 'tweet',
        tone: 'professional',
        platforms: ['twitter'],
        content: {
          twitter: { content: 'Test tweet content' }
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
    expect(response.body.data.post).toHaveProperty('id');
    expect(response.body.data.platformPosts).toHaveLength(1);
    expect(response.body.data.platformPosts[0].platform).toBe('twitter');
  });

  it('should return paginated response for GET /api/posts', async () => {
    const response = await request(app)
      .get('/api/posts?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
    expect(Array.isArray(response.body.data.posts)).toBe(true);
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination).toHaveProperty('total');
    expect(response.body.data.pagination).toHaveProperty('page');
  });
});
