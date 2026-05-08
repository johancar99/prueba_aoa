import bcrypt from "bcryptjs";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import User, { type IUser } from "../models/user.model";

interface AuthPayload {
  token: string;
  user: IUser;
}

const INVALID_CREDENTIALS_ERROR = new GraphQLError("Invalid credentials", {
  extensions: { code: "UNAUTHORIZED" }
});

export class AuthService {
  async login(email: string, password: string): Promise<AuthPayload> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw INVALID_CREDENTIALS_ERROR;
    }

    if (user.active === false) {
      throw INVALID_CREDENTIALS_ERROR;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw INVALID_CREDENTIALS_ERROR;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    return { token, user };
  }
}
