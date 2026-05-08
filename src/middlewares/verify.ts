import { NextFunction, Request, Response } from "express";
import { PermissionAction, Roles } from "@prisma/client";
import { prisma } from "@config";
import { verify } from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token not provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verify(token, process.env.SECRET_KEY as string);

    if (typeof decoded === "object" && decoded !== null && "id" in decoded && "role" in decoded) {
      req.user = {
        id: (decoded as any).id,
        role: (decoded as any).role,
      };
      next();
    } else {
      return res.status(401).json({ message: "Invalid token payload" });
    }
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

function verifyBridgeToken(req: Request, res: Response, next: NextFunction) {
  const configuredToken = process.env.HIKVISION_BRIDGE_TOKEN || process.env.HIKCENTRAL_BRIDGE_TOKEN;

  if (!configuredToken) {
    return res.status(503).json({ message: "Bridge token is not configured" });
  }

  const headerToken = req.headers["x-bridge-token"];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  const token = Array.isArray(headerToken) ? headerToken[0] : headerToken || bearerToken;

  if (!token || token !== configuredToken) {
    return res.status(401).json({ message: "Invalid bridge token" });
  }

  next();
};

function verifySuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== Roles.SUPERADMIN) {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
};

function verifyUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "USER") {
    return res.status(403).json({ message: "User access required" });
  }

  next();
};

function requireRoles(...roles: Roles[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role as Roles)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
}

function requirePermission(module: string, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user.role === Roles.SUPERADMIN) {
        return next();
      }

      if (req.user.role !== Roles.ADMIN) {
        return res.status(403).json({ message: "Admin permission required" });
      }

      const now = new Date();
      const assignment = await prisma.adminRoleAssignment.findFirst({
        where: {
          admin_id: req.user.id,
          role: {
            status: "ACTIVE",
            OR: [{ effective_from: null }, { effective_from: { lte: now } }],
            AND: [{ OR: [{ effective_to: null }, { effective_to: { gte: now } }] }],
            permissions: {
              some: {
                permission: {
                  module,
                  action: { in: [action, PermissionAction.MANAGE] },
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        return res.status(403).json({ message: `Missing ${action} permission for ${module}` });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export {
    verifyToken,
    verifyBridgeToken,
    verifyUser,
    verifyAdmin,
    verifySuperAdmin,
    requireRoles,
    requirePermission
}
