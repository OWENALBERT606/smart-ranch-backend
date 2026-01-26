// // types/express.d.ts or types/express/index.d.ts

// export type UserRole = "ADMIN" | "STAFF" | "STUDENT" | "PARENT" | "SUPER_ADMIN";

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         email: string;
//         username: string;
//         role: UserRole;
//         firstName?: string;
//         lastName?: string;
//       };
//     }
//   }
// }

// export {};



// types/express.d.ts or types/express/index.d.ts

export type UserRole = "ADMIN" | "STAFF" | "STUDENT" | "PARENT" | "SUPER_ADMIN";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;  // Add this line
        email: string;
        username?: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

export {};