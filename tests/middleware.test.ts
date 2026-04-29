import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/db';
import { redis } from '../src/config/redis';

describe('Auth Middleware', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it('should return 401 when no token is provided', async () => {
    // Attempt to access a protected route without a token
    const response = await request(app).get('/api/user/me');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('No token provided');
  });

  it('should return 401 when an invalid/expired token is provided', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlLWlkIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDM2MDB9.invalid_signature_here';

    const response = await request(app)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid or expired token');
  });
});
