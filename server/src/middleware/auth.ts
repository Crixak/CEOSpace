import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../lib/env";

export interface AuthUser {
  id: string;
  role: Role;
  branchId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Missing authorization token" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

/**
 * Resolves which branchId a request should operate on:
 * ADMIN may pass ?branchId= to target any branch (or omit for all branches).
 * MANAGER/SELLER are locked to their own branch regardless of query params.
 */
export function resolveBranchId(req: Request): string | undefined {
  if (!req.user) return undefined;
  if (req.user.role === "ADMIN") {
    const queryBranch = req.query.branchId;
    return typeof queryBranch === "string" ? queryBranch : undefined;
  }
  return req.user.branchId ?? undefined;
}
