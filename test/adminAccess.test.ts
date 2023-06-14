import Lab from "@hapi/lab";
import { expect } from "@hapi/code";

import testServer from "../src/servers/testServer";
import { TestServer } from "../src/types/server";
import { LogInResponsePayload } from "../src/types/test";
import myDataSource from "../src/services/dbConnection";
import { TestCredentials } from "../src/types/test";
import generateBasicAuthHeader from "./utils/generateAuthHeader";
import { TransactionPayload } from "../src/types/transaction";
import { TransactionCategory } from "../src/entities/Transaction";
import { Transaction } from "../src/entities/Transaction";

const { describe, it, before, after } = (exports.lab = Lab.script());

describe("Testing admin access to protected routes.", () => {
  const adminCredentials: TestCredentials = {
    username: "johndoe@example.com",
    password: "password123",
    role: "admin",
  };
  const userCredentials: TestCredentials = {
    username: "johndoe4@example.com",
    password: "password123",
    role: "user",
  };
  let adminAccessToken: string;
  let userAccessToken: string;
  let server: TestServer;

  before(async () => {
    server = await testServer();
    await myDataSource.initialize();

    const adminAuthToken = generateBasicAuthHeader(
      adminCredentials.username,
      adminCredentials.password
    );
    const userAuthToken = generateBasicAuthHeader(
      userCredentials.username,
      userCredentials.password
    );

    const adminRes = await server.inject({
      method: "post",
      url: "/api/login",
      headers: {
        authorization: adminAuthToken,
      },
    });
    const userRes = await server.inject({
      method: "post",
      url: "/api/login",
      headers: {
        authorization: userAuthToken,
      },
    });

    const adminLogInPayload: LogInResponsePayload = JSON.parse(
      adminRes.payload
    );
    adminAccessToken = adminLogInPayload.access_token;
    const userLogInPayload: LogInResponsePayload = JSON.parse(userRes.payload);
    userAccessToken = userLogInPayload.access_token;
  });

  after(async () => {
    await server.stop();
    await myDataSource.destroy();
  });

  it("Admin can get all transactions", async () => {
    const res = await server.inject({
      method: "get",
      url: "/api/transactions",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(Array.isArray(json)).to.equal(true);
    expect(res.statusCode).to.equal(200);
  });
  it("User cannot get all transactions", async () => {
    const res = await server.inject({
      method: "get",
      url: "/api/transactions",
      headers: {
        authorization: `Bearer ${userAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(401);
    expect(json).to.contain({ message: "You are not an admin." });
  });
  it("Admin can get a specific user transactions", async () => {
    const userId = 1;
    const res = await server.inject({
      method: "get",
      url: `/api/users/${userId}/transactions`,
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(json)).to.equal(true);
    expect(json[0]).to.contain(["user_id", "category", "id"]);
    expect(json[0]).to.contain({ user_id: userId });
  });
  it("Admin can get specific user transactions and filter by category", async () => {
    const category = TransactionCategory.DEPOSIT;
    const userId = 1;
    const res = await server.inject({
      method: "get",
      url: `/api/users/${userId}/transactions?category=${category}`,
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(Array.isArray(json)).to.equal(true);
    if (Array.isArray(json)) {
      const transactions = json as Transaction[];
      if (transactions.length > 0) {
        expect(transactions[0]).to.contain([
          "id",
          "category",
          "amount",
          "status",
        ]);
        expect(transactions[0].user_id).to.equal(userId);
      }
      if (transactions.length > 1) {
        expect(transactions[0].category).to.equal(category);
        expect(transactions[0].category).to.equal(transactions[1].category);
        expect(transactions[0].user_id).to.equal(transactions[1].user_id);
      }
    }
  });
  it("Admin can get a specific user balance", async () => {
    const userId = 1;
    const res = await server.inject({
      method: "get",
      url: `/api/users/${userId}/balance`,
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(json).to.include(["username", "balance"]);
  });
  it("Admin can create a new deposit transaction", async () => {
    const payload: TransactionPayload = {
      category: TransactionCategory.DEPOSIT,
      amount: 5,
      user_id: 1,
      status: "active",
    };
    const res = await server.inject({
      method: "post",
      url: "/api/transaction",
      headers: {
        authorization: `Bearer ${adminAccessToken}`,
      },
      payload: payload,
    });
    const json = JSON.parse(res.payload);
    expect(res.statusCode).to.equal(200);
    expect(json).to.include(["user", "amount"]);
    expect(json).to.include({
      amount: payload.amount,
      category: payload.category,
      status: "accepted",
    });
  });
});