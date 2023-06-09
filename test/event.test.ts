import Lab from "@hapi/lab";
import { expect, fail } from "@hapi/code";

import testServer from "../src/servers/testServer";
import { TestServer } from "../src/types/server";
import myDataSource from "../src/services/dbConnection";
import { UserTestCredentials } from "../src/types/test";
import logUserIn from "./utils/logUserIn";
import { Event } from "../src/entities/Event";
import redisClient from "../src/cache/redisClient";

const lab = Lab.script();
const { describe, it, before, after } = lab;
export { lab };

describe("Testing match route.", () => {
  const userCredentials: UserTestCredentials = {
    username: "johndoe4@example.com",
    password: "password123",
    role: "user",
  };
  const adminCredentials: UserTestCredentials = {
    username: "johndoe@example.com",
    password: "password123",
    role: "admin",
  };
  let adminAccessToken: string | null;
  let userAccessToken: string | null;
  let server: TestServer;
  let willSkip = false;

  before(async () => {
    server = await testServer();
    await myDataSource.initialize();
    await redisClient.connect();
    userAccessToken = await logUserIn(userCredentials, server);
    adminAccessToken = await logUserIn(adminCredentials, server);
    if (!userAccessToken || !adminAccessToken) willSkip = true;
  });

  after(async () => {
    await server.stop();
    await redisClient.quit();
    await myDataSource.destroy();
  });

  it("Admin can get all events.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const res = await server.inject({
      method: "get",
      url: "/api/events",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json: Event[] = JSON.parse(res.payload);
    expect(Array.isArray(json)).to.equal(true);
    expect(res.statusCode).to.equal(200);
    if (json.length > 0) expect(json[0]).to.contain(["id", "sport", "matches"]);
  });
  it("Admin can get all deleted events.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const res = await server.inject({
      method: "get",
      url: "/api/deleted-events",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json: Event[] = JSON.parse(res.payload);
    expect(Array.isArray(json)).to.equal(true);
    expect(res.statusCode).to.equal(200);
    if (json.length > 0)
      expect(json[0]).to.contain(["id", "sport", "matches", "deleted_at"]);
  });
  it("User cannot get all deleted events.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const res = await server.inject({
      method: "get",
      url: "/api/deleted-events",
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(401);
    expect(json).to.contain({
      message: "You are not an admin.",
      statusCode: 401,
      error: "Unauthorized",
    });
  });
});
