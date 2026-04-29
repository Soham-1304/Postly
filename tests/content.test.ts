import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { redis } from '../src/config/redis';
import { signAccessToken } from '../src/utils/jwt';

describe('Content Endpoints', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Content Tester',
        email: `content-${Date.now()}@example.com`,
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

  it('should validate input and return 400 for empty idea', async () => {
    const response = await request(app)
      .post('/api/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idea: '', // Empty idea
        platforms: ['twitter'],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).not.toBeNull();
  });
});
