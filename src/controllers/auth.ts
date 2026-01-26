// import { Request, Response } from "express";
// import crypto from "crypto";
// import bcryptjs from "bcryptjs";
// import jwt from "jsonwebtoken";
// import { db } from "@/db/db";
// import { sendResetEmailResend } from "@/utils/mailer";
// import { sendVerificationCodeResend } from "@/lib/mailer";
// import { UserRole, UserStatus } from "@prisma/client";

// // ==================== CONFIG ====================
// const ACCESS_TOKEN_TTL = "7d"; // 7 days
// const REFRESH_TOKEN_DAYS = 30;
// const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * REFRESH_TOKEN_DAYS;
// const RESET_TTL_MIN = 30;
// const VERIFICATION_CODE_LENGTH = 6;

// // ==================== HELPER FUNCTIONS ====================

// function generateVerificationCode(): string {
//   return String(crypto.randomInt(0, 1_000_000)).padStart(VERIFICATION_CODE_LENGTH, "0");
// }

// function generateTokens(user: { id: string; email: string; role: UserRole }) {
//   const accessToken = jwt.sign(
//     { userId: user.id, email: user.email, role: user.role },
//     process.env.JWT_SECRET!,
//     { expiresIn: ACCESS_TOKEN_TTL }
//   );

//   const refreshToken = crypto.randomUUID();

//   return { accessToken, refreshToken };
// }

// function sanitizeUser(user: any) {
//   const { password, token, ...sanitized } = user;
//   return {
//     id: sanitized.id,
//     userId: sanitized.userId,
//     email: sanitized.email,
//     phone: sanitized.phone,
//     role: sanitized.role,
//     status: sanitized.status,
//     firstName: sanitized.firstName,
//     lastName: sanitized.lastName,
//     name: sanitized.name,
//     imageUrl: sanitized.imageUrl,
//     emailVerified: sanitized.emailVerified,
//     district: sanitized.district,
//     city: sanitized.city,
//     address: sanitized.address,
//     // Professional details (for vets)
//     licenseNumber: sanitized.licenseNumber,
//     specialization: sanitized.specialization,
//     yearsOfExperience: sanitized.yearsOfExperience,
//     // Preferences
//     preferredLanguage: sanitized.preferredLanguage,
//     notificationsEnabled: sanitized.notificationsEnabled,
//     createdAt: sanitized.createdAt,
//   };
// }

// // ==================== REGISTER WITH CREDENTIALS ====================

// /**
//  * Register a new user (Farmer, Veterinarian, Caretaker, Observer)
//  * POST /api/v1/auth/register
//  */
// export async function register(req: Request, res: Response) {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       phone,
//       password,
//       role = UserRole.CARETAKER, // Default to Caretaker
//       district,
//       city,
//       address,
//       // For Veterinarians
//       licenseNumber,
//       specialization,
//       yearsOfExperience,
//     } = req.body;

//     // Validation
//     if (!firstName || !lastName || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         error: "First name, last name, email, and password are required",
//       });
//     }

//     // Password validation
//     if (password.length < 8) {
//       return res.status(400).json({
//         success: false,
//         error: "Password must be at least 8 characters",
//       });
//     }

//     // Normalize
//     const normalizedEmail = email.trim().toLowerCase();
//     const normalizedPhone = phone?.trim().replace(/\s+/g, "");

//     // Check existing user
//     const whereConditions: Array<{ email?: string; phone?: string }> = [
//       { email: normalizedEmail }
//     ];
//     if (normalizedPhone) {
//       whereConditions.push({ phone: normalizedPhone });
//     }

//     const existingUser = await db.user.findFirst({
//       where: { OR: whereConditions },
//     });

//     if (existingUser) {
//       const field = existingUser.email === normalizedEmail ? "email" : "phone";
//       return res.status(409).json({
//         success: false,
//         error: `User with this ${field} already exists`,
//       });
//     }

//     // Validate role
//     const validRoles: UserRole[] = [
//       UserRole.FARMER, 
//       UserRole.VETERINARIAN, 
//       UserRole.CARETAKER, 
//       UserRole.OBSERVER
//     ];
//     if (!validRoles.includes(role as UserRole)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid role. Must be FARMER, VETERINARIAN, CARETAKER, or OBSERVER",
//       });
//     }

//     // Veterinarian-specific validation
//     if (role === UserRole.VETERINARIAN) {
//       if (!licenseNumber) {
//         return res.status(400).json({
//           success: false,
//           error: "License number is required for veterinarians",
//         });
//       }
//       if (!specialization) {
//         return res.status(400).json({
//           success: false,
//           error: "Specialization is required for veterinarians",
//         });
//       }
//     }

//     // Hash password
//     const hashedPassword = await bcryptjs.hash(password, 12);

//     // Generate verification code
//     const verificationCode = generateVerificationCode();

//     // Build user data
//     const userData: any = {
//       firstName,
//       lastName,
//       name: `${firstName} ${lastName}`,
//       email: normalizedEmail,
//       phone: normalizedPhone || null,
//       password: hashedPassword,
//       role: role as UserRole,
//       status: UserStatus.INACTIVE,
//       token: verificationCode,
//       emailVerified: false,
//       district: district || null,
//       city: city || null,
//       address: address || null,
//     };

//     // Add veterinarian-specific fields
//     if (role === UserRole.VETERINARIAN) {
//       userData.licenseNumber = licenseNumber;
//       userData.specialization = specialization;
//       userData.yearsOfExperience = yearsOfExperience || null;
//     }

//     // Create user
//     const user = await db.user.create({
//       data: userData,
//     });

//     // Send verification email
//     try {
//       await sendVerificationCodeResend({
//         to: user.email,
//         name: user.firstName,
//         code: verificationCode,
//       });
//     } catch (emailError) {
//       console.error("Failed to send verification email:", emailError);
//     }

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId: user.id,
//         action: "USER_REGISTERED",
//         module: "auth",
//         entityType: "User",
//         entityId: user.id,
//         status: "SUCCESS",
//         description: `New ${role} registered: ${user.email}`,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Registration successful. Please check your email for verification code.",
//       data: {
//         userId: user.id,
//         email: user.email,
//         role: user.role,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Registration failed. Please try again.",
//     });
//   }
// }

// // ==================== LOGIN WITH CREDENTIALS ====================

// /**
//  * Login with email/phone and password
//  * POST /api/v1/auth/login
//  */
// export async function login(req: Request, res: Response) {
//   try {
//     const { email, phone, password } = req.body;

//     if ((!email && !phone) || !password) {
//       return res.status(400).json({
//         success: false,
//         error: "Email/phone and password are required",
//       });
//     }

//     // Find user
//     const whereConditions: Array<{ email?: string; phone?: string }> = [];
//     if (email) whereConditions.push({ email: email.trim().toLowerCase() });
//     if (phone) whereConditions.push({ phone: phone.trim().replace(/\s+/g, "") });

//     const user = await db.user.findFirst({
//       where: { OR: whereConditions },
//       include: {
//         ownedFarms: {
//           select: {
//             id: true,
//             farmId: true,
//             name: true,
//             slug: true,
//             status: true,
//             farmType: true,
//             district: true,
//             city: true,
//             totalAnimals: true,
//             subscriptionTier: true,
//           },
//           where: {
//             status: "ACTIVE",
//           },
//         },
//         farmMemberships: {
//           select: {
//             id: true,
//             farmId: true,
//             role: true,
//             status: true,
//             permissions: true,
//             farm: {
//               select: {
//                 id: true,
//                 farmId: true,
//                 name: true,
//                 slug: true,
//                 status: true,
//                 farmType: true,
//                 district: true,
//                 city: true,
//                 totalAnimals: true,
//               },
//             },
//           },
//           where: {
//             status: "ACTIVE",
//           },
//         },
//       },
//     });

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//     }

//     // Check if user has password
//     if (!user.password) {
//       return res.status(401).json({
//         success: false,
//         error: "No password set for this account. Please contact support.",
//         code: "NO_PASSWORD",
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcryptjs.compare(password, user.password);
//     if (!isValidPassword) {
//       return res.status(401).json({
//         success: false,
//         error: "Invalid credentials",
//       });
//     }

//     // Check email verification
//     if (!user.emailVerified) {
//       return res.status(403).json({
//         success: false,
//         error: "Please verify your email first",
//         code: "EMAIL_NOT_VERIFIED",
//         data: { email: user.email },
//       });
//     }

//     // Check user status
//     const statusErrors: Record<string, { error: string; code: string }> = {
//       [UserStatus.SUSPENDED]: {
//         error: "Your account has been suspended. Contact support.",
//         code: "ACCOUNT_SUSPENDED",
//       },
//       [UserStatus.INACTIVE]: {
//         error: "Your account is inactive.",
//         code: "ACCOUNT_INACTIVE",
//       },
//       [UserStatus.DEACTIVATED]: {
//         error: "Your account has been deactivated.",
//         code: "ACCOUNT_DEACTIVATED",
//       },
//     };

//     if (statusErrors[user.status]) {
//       return res.status(403).json({
//         success: false,
//         ...statusErrors[user.status],
//       });
//     }

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user);

//     // Store refresh token
//     await db.refreshToken.create({
//       data: {
//         userId: user.id,
//         token: refreshToken,
//         expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
//       },
//     });

//     // Update status if pending
//     if (user.status === UserStatus.INACTIVE) {
//       await db.user.update({
//         where: { id: user.id },
//         data: { status: UserStatus.ACTIVE },
//       });
//     }

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId: user.id,
//         action: "USER_LOGIN",
//         module: "auth",
//         entityType: "User",
//         entityId: user.id,
//         status: "SUCCESS",
//         description: `User logged in: ${user.email}`,
//         ipAddress: req.ip,
//         userAgent: req.headers["user-agent"],
//       },
//     });

//     // Prepare farms data
//     const ownedFarms = user.ownedFarms;
//     const memberFarms = user.farmMemberships.map(membership => ({
//       ...membership.farm,
//       membershipRole: membership.role,
//       membershipStatus: membership.status,
//       membershipPermissions: membership.permissions,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       data: {
//         user: sanitizeUser({ ...user, status: UserStatus.ACTIVE }),
//         accessToken,
//         refreshToken,
//         farms: {
//           owned: ownedFarms,
//           member: memberFarms,
//           total: ownedFarms.length + memberFarms.length,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Login failed. Please try again.",
//     });
//   }
// }

// // ==================== EMAIL VERIFICATION ====================

// /**
//  * Verify email with code
//  * POST /api/v1/auth/verify-email
//  */
// export async function verifyEmail(req: Request, res: Response) {
//   try {
//     const { email, code } = req.body;

//     if (!email || !code) {
//       return res.status(400).json({
//         success: false,
//         error: "Email and verification code are required",
//       });
//     }

//     const user = await db.user.findUnique({
//       where: { email: email.trim().toLowerCase() },
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     if (user.emailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: "Email already verified",
//       });
//     }

//     if (!user.token || user.token !== code) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid verification code",
//       });
//     }

//     // Update user
//     await db.user.update({
//       where: { id: user.id },
//       data: {
//         emailVerified: true,
//         status: UserStatus.ACTIVE,
//         token: null,
//       },
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId: user.id,
//         action: "EMAIL_VERIFIED",
//         module: "auth",
//         entityType: "User",
//         entityId: user.id,
//         status: "SUCCESS",
//       },
//     });

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens(user);

//     await db.refreshToken.create({
//       data: {
//         userId: user.id,
//         token: refreshToken,
//         expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Email verified successfully",
//       data: {
//         user: sanitizeUser({ ...user, emailVerified: true, status: UserStatus.ACTIVE }),
//         accessToken,
//         refreshToken,
//       },
//     });
//   } catch (error) {
//     console.error("Email verification error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Verification failed",
//     });
//   }
// }

// /**
//  * Resend verification code
//  * POST /api/v1/auth/resend-verification
//  */
// export async function resendVerification(req: Request, res: Response) {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         error: "Email is required",
//       });
//     }

//     const user = await db.user.findUnique({
//       where: { email: email.trim().toLowerCase() },
//     });

//     if (!user) {
//       return res.status(200).json({
//         success: true,
//         message: "If the email exists, a verification code has been sent",
//       });
//     }

//     if (user.emailVerified) {
//       return res.status(400).json({
//         success: false,
//         error: "Email already verified",
//       });
//     }

//     const newCode = generateVerificationCode();

//     await db.user.update({
//       where: { id: user.id },
//       data: { token: newCode },
//     });

//     await sendVerificationCodeResend({
//       to: user.email,
//       name: user.firstName ?? user.name ?? "there",
//       code: newCode,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Verification code sent",
//     });
//   } catch (error) {
//     console.error("Resend verification error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to resend verification code",
//     });
//   }
// }

// // ==================== PASSWORD RESET ====================

// /**
//  * Request password reset
//  * POST /api/v1/auth/forgot-password
//  */
// export async function forgotPassword(req: Request, res: Response) {
//   const genericResponse = {
//     success: true,
//     message: "If that email exists, a reset link has been sent",
//   };

//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(200).json(genericResponse);
//     }

//     const user = await db.user.findUnique({
//       where: { email: email.trim().toLowerCase() },
//     });

//     if (!user) {
//       return res.status(200).json(genericResponse);
//     }

//     // Invalidate old tokens
//     await db.passwordResetToken.deleteMany({
//       where: { userId: user.id, usedAt: null },
//     });

//     // Create new token
//     const rawToken = crypto.randomBytes(32).toString("hex");
//     const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

//     await db.passwordResetToken.create({
//       data: {
//         userId: user.id,
//         tokenHash,
//         expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
//       },
//     });

//     const appUrl = process.env.APP_URL ?? "http://localhost:3000";
//     const resetUrl = `${appUrl}/reset-password?token=${rawToken}&uid=${user.id}`;

//     await sendResetEmailResend({
//       to: user.email,
//       name: user.firstName ?? user.name ?? "there",
//       resetUrl,
//     });

//     await db.activityLog.create({
//       data: {
//         userId: user.id,
//         action: "PASSWORD_RESET_REQUESTED",
//         module: "auth",
//         entityType: "User",
//         entityId: user.id,
//         status: "SUCCESS",
//       },
//     });

//     return res.status(200).json(genericResponse);
//   } catch (error) {
//     console.error("Forgot password error:", error);
//     return res.status(200).json(genericResponse);
//   }
// }

// /**
//  * Reset password with token
//  * POST /api/v1/auth/reset-password
//  */
// export async function resetPassword(req: Request, res: Response) {
//   try {
//     const { uid, token, newPassword } = req.body;

//     if (!uid || !token || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         error: "Missing required fields",
//       });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({
//         success: false,
//         error: "Password must be at least 8 characters",
//       });
//     }

//     const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

//     const record = await db.passwordResetToken.findFirst({
//       where: { userId: uid, tokenHash },
//     });

//     if (!record || record.usedAt || record.expiresAt < new Date()) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid or expired reset token",
//       });
//     }

//     const hashedPassword = await bcryptjs.hash(newPassword, 12);

//     await db.$transaction([
//       db.user.update({
//         where: { id: uid },
//         data: { password: hashedPassword },
//       }),
//       db.passwordResetToken.update({
//         where: { id: record.id },
//         data: { usedAt: new Date() },
//       }),
//       db.refreshToken.deleteMany({ where: { userId: uid } }),
//     ]);

//     await db.activityLog.create({
//       data: {
//         userId: uid,
//         action: "PASSWORD_RESET_COMPLETED",
//         module: "auth",
//         entityType: "User",
//         entityId: uid,
//         status: "SUCCESS",
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Password updated successfully",
//     });
//   } catch (error) {
//     console.error("Reset password error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to reset password",
//     });
//   }
// }

// // ==================== TOKEN REFRESH ====================

// /**
//  * Refresh access token
//  * POST /api/v1/auth/refresh
//  */
// export async function refreshAccessToken(req: Request, res: Response) {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({
//         success: false,
//         error: "Refresh token is required",
//       });
//     }

//     const tokenRecord = await db.refreshToken.findUnique({
//       where: { token: refreshToken },
//       include: { user: true },
//     });

//     if (!tokenRecord) {
//       return res.status(401).json({
//         success: false,
//         error: "Invalid refresh token",
//       });
//     }

//     if (tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
//       await db.refreshToken.delete({ where: { id: tokenRecord.id } });
//       return res.status(401).json({
//         success: false,
//         error: "Refresh token expired or revoked",
//       });
//     }

//     const user = tokenRecord.user;

//     if (user.status !== UserStatus.ACTIVE) {
//       return res.status(403).json({
//         success: false,
//         error: "Account is not active",
//       });
//     }

//     const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

//     await db.$transaction([
//       db.refreshToken.delete({ where: { id: tokenRecord.id } }),
//       db.refreshToken.create({
//         data: {
//           userId: user.id,
//           token: newRefreshToken,
//           expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
//         },
//       }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: {
//         accessToken,
//         refreshToken: newRefreshToken,
//       },
//     });
//   } catch (error) {
//     console.error("Token refresh error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to refresh token",
//     });
//   }
// }

// // ==================== LOGOUT ====================

// /**
//  * Logout user
//  * POST /api/v1/auth/logout
//  */
// export async function logout(req: Request, res: Response) {
//   try {
//     const { refreshToken } = req.body;
//     const userId = (req as any).user?.userId;

//     if (refreshToken) {
//       await db.refreshToken.deleteMany({
//         where: { token: refreshToken },
//       });
//     } else if (userId) {
//       await db.refreshToken.deleteMany({
//         where: { userId },
//       });
//     }

//     if (userId) {
//       await db.activityLog.create({
//         data: {
//           userId,
//           action: "USER_LOGOUT",
//           module: "auth",
//           entityType: "User",
//           entityId: userId,
//           status: "SUCCESS",
//         },
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Logged out successfully",
//     });
//   } catch (error) {
//     console.error("Logout error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Logout failed",
//     });
//   }
// }

// /**
//  * Logout from all devices
//  * POST /api/v1/auth/logout-all
//  */
// export async function logoutAll(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         error: "Not authenticated",
//       });
//     }

//     await db.refreshToken.deleteMany({
//       where: { userId },
//     });

//     await db.activityLog.create({
//       data: {
//         userId,
//         action: "USER_LOGOUT_ALL",
//         module: "auth",
//         entityType: "User",
//         entityId: userId,
//         status: "SUCCESS",
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Logged out from all devices",
//     });
//   } catch (error) {
//     console.error("Logout all error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to logout from all devices",
//     });
//   }
// }

// // ==================== USER PROFILE ====================

// /**
//  * Get current user profile
//  * GET /api/v1/auth/me
//  */
// export async function getMe(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         error: "Not authenticated",
//       });
//     }

//     const user = await db.user.findUnique({
//       where: { id: userId },
//       include: {
//         ownedFarms: {
//           select: {
//             id: true,
//             farmId: true,
//             name: true,
//             slug: true,
//             status: true,
//             farmType: true,
//             district: true,
//             city: true,
//             totalAnimals: true,
//             subscriptionTier: true,
//             createdAt: true,
//           },
//           where: {
//             status: "ACTIVE",
//           },
//         },
//         farmMemberships: {
//           select: {
//             id: true,
//             farmId: true,
//             role: true,
//             status: true,
//             permissions: true,
//             farm: {
//               select: {
//                 id: true,
//                 farmId: true,
//                 name: true,
//                 slug: true,
//                 status: true,
//                 farmType: true,
//                 district: true,
//                 city: true,
//                 totalAnimals: true,
//               },
//             },
//           },
//           where: {
//             status: "ACTIVE",
//           },
//         },
//       },
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     const memberFarms = user.farmMemberships.map(membership => ({
//       ...membership.farm,
//       membershipRole: membership.role,
//       membershipPermissions: membership.permissions,
//     }));

//     return res.status(200).json({
//       success: true,
//       data: {
//         ...sanitizeUser(user),
//         farms: {
//           owned: user.ownedFarms,
//           member: memberFarms,
//           total: user.ownedFarms.length + memberFarms.length,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get me error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to get profile",
//     });
//   }
// }

// /**
//  * Update current user profile
//  * PATCH /api/v1/auth/me
//  */
// export async function updateMe(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         error: "Not authenticated",
//       });
//     }

//     const {
//       firstName,
//       lastName,
//       phone,
//       imageUrl,
//       address,
//       district,
//       city,
//       // Veterinarian fields
//       licenseNumber,
//       specialization,
//       yearsOfExperience,
//       // Preferences
//       preferredLanguage,
//       notificationsEnabled,
//     } = req.body;

//     const updateData: any = {};

//     if (firstName) updateData.firstName = firstName;
//     if (lastName) updateData.lastName = lastName;
//     if (firstName || lastName) {
//       const existingUser = await db.user.findUnique({ where: { id: userId } });
//       updateData.name = `${firstName ?? existingUser?.firstName} ${lastName ?? existingUser?.lastName}`;
//     }
//     if (phone) {
//       const normalizedPhone = phone.trim().replace(/\s+/g, "");
//       const existingPhone = await db.user.findFirst({
//         where: { phone: normalizedPhone, NOT: { id: userId } },
//       });
//       if (existingPhone) {
//         return res.status(409).json({
//           success: false,
//           error: "Phone number already in use",
//         });
//       }
//       updateData.phone = normalizedPhone;
//     }
//     if (imageUrl) updateData.imageUrl = imageUrl;
//     if (address !== undefined) updateData.address = address;
//     if (district !== undefined) updateData.district = district;
//     if (city !== undefined) updateData.city = city;

//     // Veterinarian-specific updates
//     if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
//     if (specialization !== undefined) updateData.specialization = specialization;
//     if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;

//     // Preferences
//     if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
//     if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

//     const user = await db.user.update({
//       where: { id: userId },
//       data: updateData,
//     });

//     await db.activityLog.create({
//       data: {
//         userId,
//         action: "PROFILE_UPDATED",
//         module: "auth",
//         entityType: "User",
//         entityId: userId,
//         status: "SUCCESS",
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Profile updated",
//       data: sanitizeUser(user),
//     });
//   } catch (error) {
//     console.error("Update me error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to update profile",
//     });
//   }
// }

// /**
//  * Change password
//  * POST /api/v1/auth/change-password
//  */
// export async function changePassword(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;

//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         error: "Not authenticated",
//       });
//     }

//     const { currentPassword, newPassword } = req.body;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         error: "Current password and new password are required",
//       });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({
//         success: false,
//         error: "New password must be at least 8 characters",
//       });
//     }

//     const user = await db.user.findUnique({ where: { id: userId } });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     if (!user.password) {
//       return res.status(400).json({
//         success: false,
//         error: "No password set for this account. Please set a password first.",
//       });
//     }

//     const isValid = await bcryptjs.compare(currentPassword, user.password);

//     if (!isValid) {
//       return res.status(400).json({
//         success: false,
//         error: "Current password is incorrect",
//       });
//     }

//     const hashedPassword = await bcryptjs.hash(newPassword, 12);

//     await db.user.update({
//       where: { id: userId },
//       data: { password: hashedPassword },
//     });

//     // Invalidate all refresh tokens for security
//     await db.refreshToken.deleteMany({
//       where: { userId },
//     });

//     await db.activityLog.create({
//       data: {
//         userId,
//         action: "PASSWORD_CHANGED",
//         module: "auth",
//         entityType: "User",
//         entityId: userId,
//         status: "SUCCESS",
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Password changed successfully. Please login again.",
//     });
//   } catch (error) {
//     console.error("Change password error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to change password",
//     });
//   }
// }

// // ==================== ADMIN: USER MANAGEMENT ====================

// /**
//  * Suspend a user (Admin only)
//  * POST /api/v1/auth/suspend/:userId
//  */
// export async function suspendUser(req: Request, res: Response) {
//   try {
//     const adminId = (req as any).user?.userId;
//     const { userId } = req.params;
//     const { reason } = req.body;

//     const user = await db.user.findUnique({ where: { id: userId } });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     await db.$transaction([
//       db.user.update({
//         where: { id: userId },
//         data: { status: UserStatus.SUSPENDED },
//       }),
//       db.refreshToken.deleteMany({ where: { userId } }),
//     ]);

//     await db.notification.create({
//       data: {
//         userId: userId,
//         type: "SYSTEM_UPDATE",
//         title: "Account Suspended",
//         message: reason ?? "Your account has been suspended. Contact support for more information.",
//       },
//     });

//     await db.activityLog.create({
//       data: {
//         userId: adminId,
//         action: "USER_SUSPENDED",
//         module: "auth",
//         entityType: "User",
//         entityId: userId,
//         status: "SUCCESS",
//         description: `Admin suspended user: ${user.email}. Reason: ${reason ?? "Not specified"}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "User suspended",
//     });
//   } catch (error) {
//     console.error("Suspend user error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to suspend user",
//     });
//   }
// }

// /**
//  * Reactivate a suspended user (Admin only)
//  * POST /api/v1/auth/reactivate/:userId
//  */
// export async function reactivateUser(req: Request, res: Response) {
//   try {
//     const adminId = (req as any).user?.userId;
//     const { userId } = req.params;

//     const user = await db.user.findUnique({ where: { id: userId } });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found",
//       });
//     }

//     if (user.status !== UserStatus.SUSPENDED) {
//       return res.status(400).json({
//         success: false,
//         error: "User is not suspended",
//       });
//     }

//     await db.user.update({
//       where: { id: userId },
//       data: { status: UserStatus.ACTIVE },
//     });

//     await db.notification.create({
//       data: {
//         userId: userId,
//         type: "SYSTEM_UPDATE",
//         title: "Account Reactivated",
//         message: "Your account has been reactivated. You can now log in.",
//       },
//     });

//     await db.activityLog.create({
//       data: {
//         userId: adminId,
//         action: "USER_REACTIVATED",
//         module: "auth",
//         entityType: "User",
//         entityId: userId,
//         status: "SUCCESS",
//         description: `Admin reactivated user: ${user.email}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "User reactivated",
//     });
//   } catch (error) {
//     console.error("Reactivate user error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to reactivate user",
//     });
//   }
// }













import { Request, Response } from "express";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@/db/db";
import { sendResetEmailResend } from "@/utils/mailer";
import { sendVerificationCodeResend } from "@/lib/mailer";
import { UserRole, UserStatus, FarmStatus } from "@prisma/client";

// ==================== CONFIG ====================
const ACCESS_TOKEN_TTL = "7d";
const REFRESH_TOKEN_DAYS = 30;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * REFRESH_TOKEN_DAYS;
const RESET_TTL_MIN = 30;
const VERIFICATION_CODE_LENGTH = 6;

// ==================== HELPER FUNCTIONS ====================

function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(VERIFICATION_CODE_LENGTH, "0");
}

function generateTokens(user: { id: string; email: string; role: UserRole }) {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = crypto.randomUUID();

  return { accessToken, refreshToken };
}

function sanitizeUser(user: any) {
  const { password, token, ...sanitized } = user;
  return {
    id: sanitized.id,
    userId: sanitized.userId,
    email: sanitized.email,
    phone: sanitized.phone,
    role: sanitized.role,
    status: sanitized.status,
    firstName: sanitized.firstName,
    lastName: sanitized.lastName,
    name: sanitized.name,
    imageUrl: sanitized.imageUrl,
    emailVerified: sanitized.emailVerified,
    district: sanitized.district,
    city: sanitized.city,
    address: sanitized.address,
    licenseNumber: sanitized.licenseNumber,
    specialization: sanitized.specialization,
    yearsOfExperience: sanitized.yearsOfExperience,
    preferredLanguage: sanitized.preferredLanguage,
    notificationsEnabled: sanitized.notificationsEnabled,
    createdAt: sanitized.createdAt,
  };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ==================== REGISTER FARMER WITH FARM ONBOARDING ====================

/**
 * Register a new farmer with farm details (pending approval)
 * POST /api/v1/auth/register-farmer
 */
export async function registerFarmer(req: Request, res: Response) {
  try {
    const {
      // User details
      firstName,
      lastName,
      email,
      phone,
      password,
      district,
      city,
      address,
      
      // Farm details
      farmName,
      farmDescription,
      farmType,
      farmCategories,
      farmDistrict,
      farmCity,
      farmVillage,
      farmSubcounty,
      farmParish,
      farmAddress,
      farmLandmark,
      sizeInAcres,
      grazingType,
      
      // Optional farm details
      climateZone,
      waterSources,
      shelterType,
      fencingType,
      hasQuarantine,
      hasMilkingParlor,
      hasLoadingRamp,
      hasColdStorage,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "First name, last name, email, and password are required",
      });
    }

    if (!farmName || !farmType || !farmDistrict) {
      return res.status(400).json({
        success: false,
        error: "Farm name, type, and district are required",
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    // Normalize
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone?.trim().replace(/\s+/g, "");

    // Check existing user
    const whereConditions: Array<{ email?: string; phone?: string }> = [
      { email: normalizedEmail }
    ];
    if (normalizedPhone) {
      whereConditions.push({ phone: normalizedPhone });
    }

    const existingUser = await db.user.findFirst({
      where: { OR: whereConditions },
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "email" : "phone";
      return res.status(409).json({
        success: false,
        error: `User with this ${field} already exists`,
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Generate farm slug
    const baseSlug = generateSlug(farmName);
    let slug = baseSlug;
    let counter = 1;
    
    while (await db.farm.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create user and farm in transaction
    const result = await db.$transaction(async (tx) => {
      // Create user (INACTIVE until email verified, then PENDING until approved)
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          email: normalizedEmail,
          phone: normalizedPhone || null,
          password: hashedPassword,
          role: UserRole.FARMER,
          status: UserStatus.INACTIVE, // Will become PENDING after email verification
          token: verificationCode,
          emailVerified: false,
          district: district || null,
          city: city || null,
          address: address || null,
        },
      });

      // Create farm (INACTIVE until approved by admin)
      const farm = await tx.farm.create({
        data: {
          name: farmName,
          slug,
          description: farmDescription || null,
          farmType,
          farmCategories: farmCategories || [],
          
          // Location
          district: farmDistrict,
          city: farmCity || null,
          village: farmVillage || null,
          subcounty: farmSubcounty || null,
          parish: farmParish || null,
          address: farmAddress || null,
          landmark: farmLandmark || null,
          sizeInAcres: sizeInAcres ? parseFloat(sizeInAcres) : null,
          
          // Ownership
          ownerId: user.id,
          
          // Grazing
          grazingType: grazingType || "SEMI_ZERO",
          
          // Environment
          climateZone: climateZone || null,
          
          // Infrastructure
          waterSources: waterSources || [],
          shelterType: shelterType || null,
          fencingType: fencingType || null,
          hasQuarantine: hasQuarantine || false,
          hasMilkingParlor: hasMilkingParlor || false,
          hasLoadingRamp: hasLoadingRamp || false,
          hasColdStorage: hasColdStorage || false,
          
          // Status - farm is INACTIVE until admin approves
          status: FarmStatus.INACTIVE,
          isActive: false,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          farmId: farm.id,
          action: "FARMER_REGISTERED",
          module: "auth",
          entityType: "User",
          entityId: user.id,
          status: "SUCCESS",
          description: `New farmer registered: ${user.email} with farm: ${farm.name}`,
        },
      });

      return { user, farm };
    });

    // Send verification email
    try {
      await sendVerificationCodeResend({
        to: result.user.email,
        name: result.user.firstName,
        code: verificationCode,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account. Your farm will be reviewed by our admin team.",
      data: {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        farmId: result.farm.id,
        farmName: result.farm.name,
        farmStatus: result.farm.status,
      },
    });
  } catch (error) {
    console.error("Farmer registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
}

// ==================== REGISTER OTHER USERS (VET, CARETAKER, OBSERVER) ====================

/**
 * Register non-farmer users (Veterinarian, Caretaker, Observer)
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role = UserRole.CARETAKER,
      district,
      city,
      address,
      // For Veterinarians
      licenseNumber,
      specialization,
      yearsOfExperience,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "First name, last name, email, and password are required",
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    // Validate role - only non-farmer roles allowed here
    const validRoles: UserRole[] = [
      UserRole.VETERINARIAN, 
      UserRole.CARETAKER, 
      UserRole.OBSERVER
    ];
    if (!validRoles.includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid role. Use /register-farmer endpoint for farmer registration.",
      });
    }

    // Normalize
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone?.trim().replace(/\s+/g, "");

    // Check existing user
    const whereConditions: Array<{ email?: string; phone?: string }> = [
      { email: normalizedEmail }
    ];
    if (normalizedPhone) {
      whereConditions.push({ phone: normalizedPhone });
    }

    const existingUser = await db.user.findFirst({
      where: { OR: whereConditions },
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? "email" : "phone";
      return res.status(409).json({
        success: false,
        error: `User with this ${field} already exists`,
      });
    }

    // Veterinarian-specific validation
    if (role === UserRole.VETERINARIAN) {
      if (!licenseNumber) {
        return res.status(400).json({
          success: false,
          error: "License number is required for veterinarians",
        });
      }
      if (!specialization) {
        return res.status(400).json({
          success: false,
          error: "Specialization is required for veterinarians",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Build user data
    const userData: any = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email: normalizedEmail,
      phone: normalizedPhone || null,
      password: hashedPassword,
      role: role as UserRole,
      status: UserStatus.INACTIVE,
      token: verificationCode,
      emailVerified: false,
      district: district || null,
      city: city || null,
      address: address || null,
    };

    // Add veterinarian-specific fields
    if (role === UserRole.VETERINARIAN) {
      userData.licenseNumber = licenseNumber;
      userData.specialization = specialization;
      userData.yearsOfExperience = yearsOfExperience || null;
    }

    // Create user
    const user = await db.user.create({
      data: userData,
    });

    // Send verification email
    try {
      await sendVerificationCodeResend({
        to: user.email,
        name: user.firstName,
        code: verificationCode,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        module: "auth",
        entityType: "User",
        entityId: user.id,
        status: "SUCCESS",
        description: `New ${role} registered: ${user.email}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification code.",
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
}

// ==================== EMAIL VERIFICATION ====================

/**
 * Verify email with code
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: "Email and verification code are required",
      });
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        ownedFarms: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Email already verified",
      });
    }

    if (!user.token || user.token !== code) {
      return res.status(400).json({
        success: false,
        error: "Invalid verification code",
      });
    }

    // For farmers, set status to PENDING (awaiting admin approval)
    // For others, set to ACTIVE
    const newStatus = user.role === UserRole.FARMER 
      ? UserStatus.INACTIVE // Keep INACTIVE but email verified - admin will activate
      : UserStatus.ACTIVE;

    // Update user
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: newStatus,
        token: null,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "EMAIL_VERIFIED",
        module: "auth",
        entityType: "User",
        entityId: user.id,
        status: "SUCCESS",
        description: `Email verified for ${user.role}`,
      },
    });

    // For farmers, don't generate tokens yet - they need admin approval
    if (user.role === UserRole.FARMER) {
      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Your account is pending admin approval. You'll receive a notification once approved.",
        data: {
          user: sanitizeUser({ ...user, emailVerified: true, status: newStatus }),
          requiresApproval: true,
          farmStatus: user.ownedFarms[0]?.status || "INACTIVE",
        },
      });
    }

    // For non-farmers, generate tokens and allow login
    const { accessToken, refreshToken } = generateTokens(user);

    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: sanitizeUser({ ...user, emailVerified: true, status: UserStatus.ACTIVE }),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Verification failed",
    });
  }
}

// ==================== LOGIN WITH CREDENTIALS ====================

/**
 * Login with email/phone and password
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        error: "Email/phone and password are required",
      });
    }

    // Find user
    const whereConditions: Array<{ email?: string; phone?: string }> = [];
    if (email) whereConditions.push({ email: email.trim().toLowerCase() });
    if (phone) whereConditions.push({ phone: phone.trim().replace(/\s+/g, "") });

    const user = await db.user.findFirst({
      where: { OR: whereConditions },
      include: {
        ownedFarms: {
          select: {
            id: true,
            farmId: true,
            name: true,
            slug: true,
            status: true,
            farmType: true,
            district: true,
            city: true,
            totalAnimals: true,
            subscriptionTier: true,
          },
        },
        farmMemberships: {
          select: {
            id: true,
            farmId: true,
            role: true,
            status: true,
            permissions: true,
            farm: {
              select: {
                id: true,
                farmId: true,
                name: true,
                slug: true,
                status: true,
                farmType: true,
                district: true,
                city: true,
                totalAnimals: true,
              },
            },
          },
          // where: {
          //   status: "ACTIVE",
          // },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if user has password
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: "No password set for this account. Please contact support.",
        code: "NO_PASSWORD",
      });
    }

    // Verify password
    const isValidPassword = await bcryptjs.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: "Please verify your email first",
        code: "EMAIL_NOT_VERIFIED",
        data: { email: user.email },
      });
    }

    // Special handling for FARMERS - check if approved
    if (user.role === UserRole.FARMER && user.status === UserStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        error: "Your account is pending admin approval. You'll receive a notification once approved.",
        code: "PENDING_APPROVAL",
        data: { 
          email: user.email,
          farmStatus: user.ownedFarms[0]?.status || "INACTIVE",
        },
      });
    }

    // Check user status
    const statusErrors: Record<string, { error: string; code: string }> = {
      [UserStatus.SUSPENDED]: {
        error: "Your account has been suspended. Contact support.",
        code: "ACCOUNT_SUSPENDED",
      },
      [UserStatus.DEACTIVATED]: {
        error: "Your account has been deactivated.",
        code: "ACCOUNT_DEACTIVATED",
      },
    };

    if (statusErrors[user.status]) {
      return res.status(403).json({
        success: false,
        ...statusErrors[user.status],
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await db.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN",
        module: "auth",
        entityType: "User",
        entityId: user.id,
        status: "SUCCESS",
        description: `User logged in: ${user.email}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    // Prepare farms data
    // const ownedFarms = user.ownedFarms.filter(farm => farm.status === "ACTIVE");
    const ownedFarms = user.ownedFarms; // Don't filter by status
    const memberFarms = user.farmMemberships.map(membership => ({
      ...membership.farm,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      membershipPermissions: membership.permissions,
    }));

    console.log("🔍 Backend Login - Sending response:", {
  userEmail: user.email,
  userRole: user.role,
  ownedFarmsCount: ownedFarms.length,
  firstFarmSlug: ownedFarms[0]?.slug || "NO FARM",
  firstFarmStatus: ownedFarms[0]?.status || "N/A",
  allFarms: ownedFarms.map(f => ({ slug: f.slug, status: f.status })),
});

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
        farms: {
          owned: ownedFarms,
          member: memberFarms,
          total: ownedFarms.length + memberFarms.length,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
}

// ==================== ADMIN: APPROVE FARMER & FARM ====================

/**
 * Approve a farmer and activate their farm (Super Admin only)
 * POST /api/v1/auth/admin/approve-farmer/:userId
 */
export async function approveFarmer(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.userId;
    const adminRole = (req as any).user?.role;
    const { userId } = req.params;
    const { notes } = req.body;

    // Check if admin is SUPER_ADMIN
    if (adminRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "Only super admins can approve farmers",
      });
    }

    const user = await db.user.findUnique({ 
      where: { id: userId },
      include: {
        ownedFarms: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== UserRole.FARMER) {
      return res.status(400).json({
        success: false,
        error: "User is not a farmer",
      });
    }

    if (user.status === UserStatus.ACTIVE) {
      return res.status(400).json({
        success: false,
        error: "Farmer is already approved",
      });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Farmer must verify email first",
      });
    }

    if (user.ownedFarms.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No farm found for this farmer",
      });
    }

    // Approve farmer and activate farm in transaction
    await db.$transaction(async (tx) => {
      // Activate farmer
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });

      // Activate all owned farms
      await tx.farm.updateMany({
        where: { ownerId: userId },
        data: { 
          status: FarmStatus.ACTIVE,
          isActive: true,
        },
      });

      // Create notification for farmer
      await tx.notification.create({
        data: {
          userId: userId,
          type: "SYSTEM_UPDATE",
          title: "Account Approved!",
          message: `Congratulations! Your farmer account and farm have been approved. You can now access all features.${notes ? ` Admin notes: ${notes}` : ''}`,
          priority: "HIGH",
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: adminId,
          farmId: user.ownedFarms[0].id,
          action: "FARMER_APPROVED",
          module: "auth",
          entityType: "User",
          entityId: userId,
          status: "SUCCESS",
          description: `Super admin approved farmer: ${user.email} and farm: ${user.ownedFarms[0].name}`,
          metadata: { notes },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Farmer and farm approved successfully",
      data: {
        userId: user.id,
        email: user.email,
        farmId: user.ownedFarms[0].id,
        farmName: user.ownedFarms[0].name,
      },
    });
  } catch (error) {
    console.error("Approve farmer error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to approve farmer",
    });
  }
}

/**
 * Reject a farmer registration (Super Admin only)
 * POST /api/v1/auth/admin/reject-farmer/:userId
 */
export async function rejectFarmer(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.userId;
    const adminRole = (req as any).user?.role;
    const { userId } = req.params;
    const { reason } = req.body;

    // Check if admin is SUPER_ADMIN
    if (adminRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "Only super admins can reject farmers",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: "Rejection reason is required",
      });
    }

    const user = await db.user.findUnique({ 
      where: { id: userId },
      include: {
        ownedFarms: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== UserRole.FARMER) {
      return res.status(400).json({
        success: false,
        error: "User is not a farmer",
      });
    }

    // Suspend farmer and farm
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.SUSPENDED },
      });

      await tx.farm.updateMany({
        where: { ownerId: userId },
        data: { status: FarmStatus.SUSPENDED },
      });

      await tx.notification.create({
        data: {
          userId: userId,
          type: "SYSTEM_UPDATE",
          title: "Application Rejected",
          message: `Your farmer application has been rejected. Reason: ${reason}. Please contact support for more information.`,
          priority: "HIGH",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: "FARMER_REJECTED",
          module: "auth",
          entityType: "User",
          entityId: userId,
          status: "SUCCESS",
          description: `Super admin rejected farmer: ${user.email}. Reason: ${reason}`,
          metadata: { reason },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Farmer application rejected",
    });
  } catch (error) {
    console.error("Reject farmer error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reject farmer",
    });
  }
}

/**
 * Get pending farmer approvals (Super Admin only)
 * GET /api/v1/auth/admin/pending-farmers
 */
export async function getPendingFarmers(req: Request, res: Response) {
  try {
    const adminRole = (req as any).user?.role;

    if (adminRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "Only super admins can view pending farmers",
      });
    }

    const pendingFarmers = await db.user.findMany({
      where: {
        role: UserRole.FARMER,
        emailVerified: true,
        status: UserStatus.INACTIVE,
      },
      include: {
        ownedFarms: {
          select: {
            id: true,
            farmId: true,
            name: true,
            slug: true,
            farmType: true,
            farmCategories: true,
            district: true,
            city: true,
            sizeInAcres: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const sanitizedFarmers = pendingFarmers.map(farmer => ({
      ...sanitizeUser(farmer),
      farm: farmer.ownedFarms[0] || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        farmers: sanitizedFarmers,
        total: sanitizedFarmers.length,
      },
    });
  } catch (error) {
    console.error("Get pending farmers error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch pending farmers",
    });
  }
}

// ... (Keep all other existing functions: resendVerification, forgotPassword, resetPassword, 
//      refreshAccessToken, logout, logoutAll, getMe, updateMe, changePassword, 
//      suspendUser, reactivateUser exactly as they are)

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a verification code has been sent",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: "Email already verified",
      });
    }

    const newCode = generateVerificationCode();

    await db.user.update({
      where: { id: user.id },
      data: { token: newCode },
    });

    await sendVerificationCodeResend({
      to: user.email,
      name: user.firstName ?? user.name ?? "there",
      code: newCode,
    });

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to resend verification code",
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const genericResponse = {
    success: true,
    message: "If that email exists, a reset link has been sent",
  };

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(200).json(genericResponse);
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    await db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}&uid=${user.id}`;

    await sendResetEmailResend({
      to: user.email,
      name: user.firstName ?? user.name ?? "there",
      resetUrl,
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        module: "auth",
        entityType: "User",
        entityId: user.id,
        status: "SUCCESS",
      },
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(200).json(genericResponse);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { uid, token, newPassword } = req.body;

    if (!uid || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await db.passwordResetToken.findFirst({
      where: { userId: uid, tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await db.$transaction([
      db.user.update({
        where: { id: uid },
        data: { password: hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.refreshToken.deleteMany({ where: { userId: uid } }),
    ]);

    await db.activityLog.create({
      data: {
        userId: uid,
        action: "PASSWORD_RESET_COMPLETED",
        module: "auth",
        entityType: "User",
        entityId: uid,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reset password",
    });
  }
}

export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    const tokenRecord = await db.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    if (tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      await db.refreshToken.delete({ where: { id: tokenRecord.id } });
      return res.status(401).json({
        success: false,
        error: "Refresh token expired or revoked",
      });
    }

    const user = tokenRecord.user;

    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        error: "Account is not active",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    await db.$transaction([
      db.refreshToken.delete({ where: { id: tokenRecord.id } }),
      db.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to refresh token",
    });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    const userId = (req as any).user?.userId;

    if (refreshToken) {
      await db.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } else if (userId) {
      await db.refreshToken.deleteMany({
        where: { userId },
      });
    }

    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "USER_LOGOUT",
          module: "auth",
          entityType: "User",
          entityId: userId,
          status: "SUCCESS",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
}

export async function logoutAll(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    await db.refreshToken.deleteMany({
      where: { userId },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "USER_LOGOUT_ALL",
        module: "auth",
        entityType: "User",
        entityId: userId,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to logout from all devices",
    });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        ownedFarms: {
          select: {
            id: true,
            farmId: true,
            name: true,
            slug: true,
            status: true,
            farmType: true,
            district: true,
            city: true,
            totalAnimals: true,
            subscriptionTier: true,
            createdAt: true,
          },
          // where: {
          //   status: "ACTIVE",
          // },
        },
        farmMemberships: {
          select: {
            id: true,
            farmId: true,
            role: true,
            status: true,
            permissions: true,
            farm: {
              select: {
                id: true,
                farmId: true,
                name: true,
                slug: true,
                status: true,
                farmType: true,
                district: true,
                city: true,
                totalAnimals: true,
              },
            },
          },
          // where: {
          //   status: "ACTIVE",
          // },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const memberFarms = user.farmMemberships.map(membership => ({
      ...membership.farm,
      membershipRole: membership.role,
      membershipPermissions: membership.permissions,
    }));

    return res.status(200).json({
      success: true,
      data: {
        ...sanitizeUser(user),
        farms: {
          owned: user.ownedFarms,
          member: memberFarms,
          total: user.ownedFarms.length + memberFarms.length,
        },
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get profile",
    });
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const {
      firstName,
      lastName,
      phone,
      imageUrl,
      address,
      district,
      city,
      licenseNumber,
      specialization,
      yearsOfExperience,
      preferredLanguage,
      notificationsEnabled,
    } = req.body;

    const updateData: any = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName || lastName) {
      const existingUser = await db.user.findUnique({ where: { id: userId } });
      updateData.name = `${firstName ?? existingUser?.firstName} ${lastName ?? existingUser?.lastName}`;
    }
    if (phone) {
      const normalizedPhone = phone.trim().replace(/\s+/g, "");
      const existingPhone = await db.user.findFirst({
        where: { phone: normalizedPhone, NOT: { id: userId } },
      });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: "Phone number already in use",
        });
      }
      updateData.phone = normalizedPhone;
    }
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (address !== undefined) updateData.address = address;
    if (district !== undefined) updateData.district = district;
    if (city !== undefined) updateData.city = city;

    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;

    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "PROFILE_UPDATED",
        module: "auth",
        entityType: "User",
        entityId: userId,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Update me error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 8 characters",
      });
    }

    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: "No password set for this account. Please set a password first.",
      });
    }

    const isValid = await bcryptjs.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await db.refreshToken.deleteMany({
      where: { userId },
    });

    await db.activityLog.create({
      data: {
        userId,
        action: "PASSWORD_CHANGED",
        module: "auth",
        entityType: "User",
        entityId: userId,
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
}

export async function suspendUser(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.userId;
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { status: UserStatus.SUSPENDED },
      }),
      db.refreshToken.deleteMany({ where: { userId } }),
    ]);

    await db.notification.create({
      data: {
        userId: userId,
        type: "SYSTEM_UPDATE",
        title: "Account Suspended",
        message: reason ?? "Your account has been suspended. Contact support for more information.",
      },
    });

    await db.activityLog.create({
      data: {
        userId: adminId,
        action: "USER_SUSPENDED",
        module: "auth",
        entityType: "User",
        entityId: userId,
        status: "SUCCESS",
        description: `Admin suspended user: ${user.email}. Reason: ${reason ?? "Not specified"}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User suspended",
    });
  } catch (error) {
    console.error("Suspend user error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to suspend user",
    });
  }
}

export async function reactivateUser(req: Request, res: Response) {
  try {
    const adminId = (req as any).user?.userId;
    const { userId } = req.params;

    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.status !== UserStatus.SUSPENDED) {
      return res.status(400).json({
        success: false,
        error: "User is not suspended",
      });
    }

    await db.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await db.notification.create({
      data: {
        userId: userId,
        type: "SYSTEM_UPDATE",
        title: "Account Reactivated",
        message: "Your account has been reactivated. You can now log in.",
      },
    });

    await db.activityLog.create({
      data: {
        userId: adminId,
        action: "USER_REACTIVATED",
        module: "auth",
        entityType: "User",
        entityId: userId,
        status: "SUCCESS",
        description: `Admin reactivated user: ${user.email}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User reactivated",
    });
  } catch (error) {
    console.error("Reactivate user error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to reactivate user",
    });
  }
}