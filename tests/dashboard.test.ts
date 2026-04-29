import request from "supertest";
import { app } from "../src/app";
import { signAccessToken } from "../src/utils/jwt";
import { DashboardService } from "../src/modules/dashboard/dashboard.service";

// Mock the DashboardService
jest.mock("../src/modules/dashboard/dashboard.service");

describe("GET /api/dashboard/stats", () => {
  const testUserId = "test-user-123";
  const testEmail = "test@example.com";
  let validToken: string;

  beforeAll(() => {
    validToken = signAccessToken(testUserId, testEmail);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const response = await request(app)
      .get("/api/dashboard/stats")
      .expect(401);

    expect(response.body).toMatchObject({
      data: null,
      error: {
        message: expect.any(String),
        code: 401
      }
    });
  });

  it("returns 401 with invalid token", async () => {
    const response = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", "Bearer invalid_token_xyz")
      .expect(401);

    expect(response.body.error.code).toBe(401);
  });

  it("returns dashboard stats for authenticated user", async () => {
    const mockStats = {
      totalPosts: 5,
      publishedPosts: 3,
      failedPosts: 1,
      queuedPosts: 1,
      cancelledPosts: 0,
      successRate: 60,
      byPlatform: [
        {
          platform: "twitter",
          total: 2,
          published: 2,
          failed: 0,
          queued: 0,
          cancelled: 0
        },
        {
          platform: "linkedin",
          total: 2,
          published: 1,
          failed: 1,
          queued: 0,
          cancelled: 0
        },
        {
          platform: "instagram",
          total: 1,
          published: 0,
          failed: 0,
          queued: 1,
          cancelled: 0
        }
      ]
    };

    // Mock the service method
    (DashboardService.prototype.getStats as jest.Mock).mockResolvedValue(mockStats);

    const response = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      data: mockStats,
      meta: null,
      error: null
    });
  });

  it("returns correct response structure with all required fields", async () => {
    const mockStats = {
      totalPosts: 10,
      publishedPosts: 7,
      failedPosts: 2,
      queuedPosts: 1,
      cancelledPosts: 0,
      successRate: 70,
      byPlatform: []
    };

    (DashboardService.prototype.getStats as jest.Mock).mockResolvedValue(mockStats);

    const response = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    // Verify response envelope
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(response.body).toHaveProperty("error");

    // Verify stats structure
    const stats = response.body.data;
    expect(stats).toHaveProperty("totalPosts");
    expect(stats).toHaveProperty("publishedPosts");
    expect(stats).toHaveProperty("failedPosts");
    expect(stats).toHaveProperty("queuedPosts");
    expect(stats).toHaveProperty("cancelledPosts");
    expect(stats).toHaveProperty("successRate");
    expect(stats).toHaveProperty("byPlatform");

    // Verify types
    expect(typeof stats.totalPosts).toBe("number");
    expect(typeof stats.successRate).toBe("number");
    expect(Array.isArray(stats.byPlatform)).toBe(true);
  });

  it("includes platform breakdown in stats response", async () => {
    const mockStats = {
      totalPosts: 6,
      publishedPosts: 4,
      failedPosts: 0,
      queuedPosts: 2,
      cancelledPosts: 0,
      successRate: 66.67,
      byPlatform: [
        {
          platform: "twitter",
          total: 3,
          published: 2,
          failed: 0,
          queued: 1,
          cancelled: 0
        },
        {
          platform: "linkedin",
          total: 2,
          published: 2,
          failed: 0,
          queued: 0,
          cancelled: 0
        },
        {
          platform: "instagram",
          total: 1,
          published: 0,
          failed: 0,
          queued: 1,
          cancelled: 0
        }
      ]
    };

    (DashboardService.prototype.getStats as jest.Mock).mockResolvedValue(mockStats);

    const response = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    const byPlatform = response.body.data.byPlatform;
    expect(byPlatform).toHaveLength(3);

    // Verify platform structure
    byPlatform.forEach((platform: any) => {
      expect(platform).toHaveProperty("platform");
      expect(platform).toHaveProperty("total");
      expect(platform).toHaveProperty("published");
      expect(platform).toHaveProperty("failed");
      expect(platform).toHaveProperty("queued");
      expect(platform).toHaveProperty("cancelled");

      expect(typeof platform.total).toBe("number");
      expect(typeof platform.published).toBe("number");
      expect(typeof platform.failed).toBe("number");
    });
  });

  it("handles zero posts scenario", async () => {
    const mockStats = {
      totalPosts: 0,
      publishedPosts: 0,
      failedPosts: 0,
      queuedPosts: 0,
      cancelledPosts: 0,
      successRate: 0,
      byPlatform: []
    };

    (DashboardService.prototype.getStats as jest.Mock).mockResolvedValue(mockStats);

    const response = await request(app)
      .get("/api/dashboard/stats")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      totalPosts: 0,
      publishedPosts: 0,
      failedPosts: 0,
      queuedPosts: 0,
      cancelledPosts: 0,
      successRate: 0,
      byPlatform: []
    });
  });
});
