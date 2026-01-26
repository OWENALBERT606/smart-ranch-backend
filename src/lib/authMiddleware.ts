// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { AuthRequest } from "@/utils/auth";


// export interface AuthRequest extends Request {
//   user?: TokenPayload;
// }

/**
 * Main authentication middleware - verifies JWT token
 */
// export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ error: "No token provided" });
//   }

//   jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
//     if (err || !decoded) {
//       return res.status(403).json({ error: "Invalid or expired token" });
//     }

//     req.user = decoded as TokenPayload;
//     next();
//   });
// }


export interface TokenPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err || !decoded) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const payload = decoded as any;
    
    // ✅ Map userId to id for consistency across controllers
    req.user = {
      id: payload.userId || payload.id,        // Controllers use this
      userId: payload.userId || payload.id,    // Keep for compatibility
      email: payload.email,
      username: payload.username,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
    
    console.log("✅ Auth middleware - User authenticated:", {
      id: req?.user?.id,
      userId: req?.user?.userId,
      email: req?.user?.email,
      role: req?.user?.role
    });
    
    next();
  });
}


/**
 * Generic role-based authorization middleware
 * @param allowedRoles - Array of allowed role strings
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
}

/**
 * Super Admin only middleware
 */
export function superAdminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Super admin privileges required.",
    });
  }

  next();
}

/**
 * Farmer only middleware
 */
export function farmerMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  if (req.user.role !== UserRole.FARMER) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Farmer role required.",
    });
  }

  next();
}

/**
 * Veterinarian only middleware
 */
export function veterinarianMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  if (req.user.role !== UserRole.VETERINARIAN) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Veterinarian role required.",
    });
  }

  next();
}

/**
 * Caretaker only middleware
 */
export function caretakerMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  if (req.user.role !== UserRole.CARETAKER) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Caretaker role required.",
    });
  }

  next();
}

/**
 * Observer only middleware
 */
export function observerMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Not authenticated",
    });
  }

  if (req.user.role !== UserRole.OBSERVER) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Observer role required.",
    });
  }

  next();
}

/**
 * Type-safe role middleware using UserRole enum
 * @param allowedRoles - Array of UserRole enum values
 * @example
 * // Allow only farmers and veterinarians
 * router.get('/endpoint', authenticateToken, roleMiddleware([UserRole.FARMER, UserRole.VETERINARIAN]), handler);
 */
export function roleMiddleware(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}