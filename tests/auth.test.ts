import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { redis } from '../src/config/redis';

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.error).toBeNull();
    expect(response.body.data.user).toHaveProperty('id');
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
  });

  it('should login and return tokens', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(response.status).toBe(200);
    expect(response.body.error).toBeNull();
    expect(response.body.data.user.email).toBe(testUser.email);
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
  });
});
