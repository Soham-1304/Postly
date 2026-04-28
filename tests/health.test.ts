import request from "supertest";
import { app } from "../src/app";

describe("GET /health", () => {
  it("returns service status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({
      data: {
        status: "ok"
      },
      meta: null,
      error: null
    });
  });
});
