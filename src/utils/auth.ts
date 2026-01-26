// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";

// export interface AuthRequest extends Request {
//   user?: any;
// }

// export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) return res.status(401).json({ error: "No token provided" });

//   jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
//     if (err) return res.status(403).json({ error: "Invalid token" });
//     req.user = user;
//     next();
//   });
// }


// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";

// export interface TokenPayload {
//   userId: string;
//   email: string;
//   role: string;
// }

// export interface AuthRequest extends Request {
//   user?: TokenPayload;
// }

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

//     req.user = decoded as TokenPayload; // Ensure correct typing
//     next();
//   });
// }





// utils/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  id: string;          // ✅ Add this
  userId: string;
  email: string;
  username?: string;   // ✅ Add this
  role: string;
  firstName?: string;  // ✅ Add this
  lastName?: string;   // ✅ Add this
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
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
      id: payload.userId || payload.id,
      userId: payload.userId || payload.id,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };

    next();
  });
}