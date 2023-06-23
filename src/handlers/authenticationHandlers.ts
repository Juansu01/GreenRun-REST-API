import { ResponseToolkit, Request } from "hapi";

import { User } from "../entities/User";
import {
  RegisterRequest,
  AuthenticationRequest,
  UserCredentials,
} from "../types/authentication";
import { hapiJWTGenerateToken } from "../services/accessTokenGenerators";
import Boom from "@hapi/boom";

export const registerHandler = async (
  request: RegisterRequest,
  h: ResponseToolkit
) => {
  const {
    role,
    first_name,
    last_name,
    phone,
    email,
    password,
    username,
    address,
    gender,
    birth_date,
    country_id,
    city,
    category,
    document_id,
  } = request.payload;

  const user = await User.findOneBy({ email: email });
  if (user) throw Boom.notAcceptable("Email is already taken.");
  const newUser = User.create({
    role,
    first_name,
    last_name,
    phone,
    email,
    password,
    username,
    address,
    gender,
    birth_date,
    country_id,
    city,
    category,
    document_id,
  });

  await newUser.save();

  return h.response(newUser).header("Content-Type", "application/json");
};

export const loginHandler = async (
  request: AuthenticationRequest,
  h: ResponseToolkit
) => {
  const userCredentials = request.auth.credentials as UserCredentials;
  const accessToken: string = hapiJWTGenerateToken(
    userCredentials.email,
    userCredentials.role
  );
  return h.response({
    message: "Logged in successfully!",
    access_token: accessToken,
  });
};

export const blockUser = async (
  request: AuthenticationRequest,
  h: ResponseToolkit
) => {
  const { id } = request.params;
  const userToBlock = await User.findOneBy({ id: parseInt(id) });

  if (userToBlock) {
    if (userToBlock.role === "admin")
      throw Boom.forbidden("Cannot block other admins.");

    if (userToBlock.state === "blocked")
      throw Boom.badRequest("User is already blocked.");

    userToBlock.state = "blocked";
    await userToBlock.save();

    return h.response(
      `User identified by email: ${userToBlock.email} has been blocked.`
    );
  }

  throw Boom.notFound("User was not found.");
};

export const logoutHandler = async (request: Request, h: ResponseToolkit) => {
  return h.response("You're logging out.");
};
