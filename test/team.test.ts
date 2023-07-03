import Lab from "@hapi/lab";
import { expect, fail } from "@hapi/code";

import testServer from "../src/servers/testServer";
import { TestServer } from "../src/types/server";
import myDataSource from "../src/services/dbConnection";
import { TestCredentials } from "../src/types/test";
import logUserIn from "./utils/logUserIn";
import { Team } from "../src/entities/Team";
import redisClient from "../src/cache/redisClient";

const lab = Lab.script();
const { describe, it, before, after } = lab;
export { lab };

describe("Testing match route.", () => {
  const userCredentials: TestCredentials = {
    username: "johndoe4@example.com",
    password: "password123",
    role: "user",
  };
  const adminCredentials: TestCredentials = {
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

  it("User can get all teams.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const res = await server.inject({
      method: "get",
      url: "/api/teams",
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
    });
    const json: Team[] = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(json)).to.equal(true);
    expect(json[0]).to.contain(["match", "match_id", "name"]);
  });
  it("Admin can get all teams.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const res = await server.inject({
      method: "get",
      url: "/api/teams",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json: Team[] = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(json)).to.equal(true);
    expect(json[0]).to.contain(["match", "match_id", "name"]);
  });
  it("User can get a specific team by id.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const teamId = 1;
    const res = await server.inject({
      method: "get",
      url: `/api/teams/${teamId}`,
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
    });
    const json: Team = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(json).to.contain(["match", "match_id", "name"]);
  });
  it("Admin can get a specific team by id.", async () => {
    if (willSkip) fail("Wrong user credentials, test automatically failed.");
    const teamId = 1;
    const res = await server.inject({
      method: "get",
      url: `/api/teams/${teamId}`,
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json: Team = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(json).to.contain(["match", "match_id", "name"]);
  });
});
