import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface JwtPayload {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
}

const getTokenFromHeader = (authorization?: string): string | null => {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
};

/**
 * Pass-through middleware: extracts and verifies the JWT if present,
 * then attaches the decoded user to req.user. Always calls next().
 * Authentication enforcement is handled at the resolver layer via auth guards.
 */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch {
    req.user = undefined;
  }

  next();
};
