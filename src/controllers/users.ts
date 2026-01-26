import { db } from "@/db/db";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto, { randomInt } from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  TokenPayload,
} from "@/utils/tokens";
import { AuthRequest } from "@/utils/auth";
import { UserRole, UserStatus } from "@prisma/client";
import { sendVerificationCodeResend } from "@/lib/mailer";

/* ======================
   HELPERS
====================== */

const isValidRole = (v: any): v is UserRole =>
  Object.values(UserRole).includes(v as UserRole);

const isValidStatus = (v: any): v is UserStatus =>
  Object.values(UserStatus).includes(v as UserStatus);

// Secure 6-digit numeric code, zero-padded
const makeSixDigitToken = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * Sanitize user object - remove sensitive fields
 */
function sanitizeUser(user: any) {
  const { password, token, ...safe } = user;
  return safe;
}

/* ======================
   CREATE USER
   POST /api/v1/users
====================== */
export async function createUser(req: Request, res: Response) {
  const {
    email,
    phone,
    password,
    firstName,
    lastName,
    imageUrl,
    role,
    status,
    // Location
    district,
    city,
    address,
    // Veterinarian-specific
    licenseNumber,
    specialization,
    yearsOfExperience,
  } = req.body as {
    email: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    imageUrl?: string;
    role?: UserRole | string;
    status?: UserStatus | string;
    district?: string;
    city?: string;
    address?: string;
    licenseNumber?: string;
    specialization?: string;
    yearsOfExperience?: number;
  };

  try {
    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        data: null,
        error: "Email, password, first name, and last name are required.",
      });
    }

    // Password length validation
    if (password.length < 8) {
      return res.status(400).json({
        data: null,
        error: "Password must be at least 8 characters long.",
      });
    }

    const emailNorm = email.trim().toLowerCase();
    const phoneNorm = phone?.trim().replace(/\s+/g, "");
    const roleValue: UserRole = isValidRole(role) ? (role as UserRole) : UserRole.CARETAKER;
    const statusValue: UserStatus = isValidStatus(status)
      ? (status as UserStatus)
      : UserStatus.ACTIVE;

    // Validate role
    const validRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.FARMER,
      UserRole.VETERINARIAN,
      UserRole.CARETAKER,
      UserRole.OBSERVER,
    ];
    if (!validRoles.includes(roleValue)) {
      return res.status(400).json({
        data: null,
        error: "Invalid role. Must be SUPER_ADMIN, FARMER, VETERINARIAN, CARETAKER, or OBSERVER.",
      });
    }

    // Veterinarian validation
    if (roleValue === UserRole.VETERINARIAN) {
      if (!licenseNumber) {
        return res.status(400).json({
          data: null,
          error: "License number is required for veterinarians.",
        });
      }
      if (!specialization) {
        return res.status(400).json({
          data: null,
          error: "Specialization is required for veterinarians.",
        });
      }
    }

    // Pre-check for existing user
    const whereConditions = [{ email: emailNorm }];
    if (phoneNorm) {
      whereConditions.push({ phone: phoneNorm });
    }

    const existing = await db.user.findFirst({
      where: { OR: whereConditions },
      select: { id: true, email: true, phone: true },
    });

    if (existing) {
      const field = existing.email === emailNorm ? "email" : "phone";
      return res.status(409).json({
        data: null,
        error: `User with this ${field} already exists.`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = makeSixDigitToken();

    // Build user data
    const userData: any = {
      email: emailNorm,
      phone: phoneNorm || null,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      imageUrl: imageUrl || null,
      password: hashedPassword,
      role: roleValue,
      status: statusValue,
      emailVerified: true, // Admin-created users are pre-verified
      token: verificationCode,
      district: district || null,
      city: city || null,
      address: address || null,
    };

    // Add veterinarian-specific fields
    if (roleValue === UserRole.VETERINARIAN) {
      userData.licenseNumber = licenseNumber;
      userData.specialization = specialization;
      userData.yearsOfExperience = yearsOfExperience || null;
    }

    const newUser = await db.user.create({
      data: userData,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        imageUrl: true,
        role: true,
        status: true,
        emailVerified: true,
        district: true,
        city: true,
        address: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        preferredLanguage: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: newUser.id,
        action: "USER_CREATED",
        module: "users",
        entityType: "User",
        entityId: newUser.id,
        status: "SUCCESS",
        description: `User created: ${newUser.email} (${newUser.role})`,
      },
    });

    // Optionally send verification email
    try {
      await sendVerificationCodeResend({
        to: newUser.email,
        name: newUser.firstName ?? newUser.name ?? "there",
        code: verificationCode,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return res.status(201).json({ data: newUser, error: null });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        data: null,
        error: "Email or phone already in use.",
      });
    }
    console.error("Error creating user:", error);
    return res.status(500).json({
      data: null,
      error: "Something went wrong while creating user.",
    });
  }
}

/* ======================
   LOGIN USER
   POST /api/v1/users/login
====================== */
export async function loginUser(req: Request, res: Response) {
  const { identifier, password } = req.body as {
    identifier: string;
    password: string;
  };

  try {
    if (!identifier || !password) {
      return res.status(400).json({
        data: null,
        error: "Email/phone and password are required.",
      });
    }

    const idNorm = identifier.trim().toLowerCase();
    const user = await db.user.findFirst({
      where: {
        OR: [{ email: idNorm }, { phone: identifier.trim().replace(/\s+/g, "") }],
      },
      include: {
        ownedFarms: {
          select: {
            id: true,
            farmId: true,
            name: true,
            slug: true,
            status: true,
          },
          where: {
            status: "ACTIVE",
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
              },
            },
          },
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        data: null,
        error: "Invalid credentials.",
      });
    }

    // Check status
    if (user.status !== "ACTIVE") {
      const statusMessages: Record<string, string> = {
        PENDING: "Your account is pending verification.",
        SUSPENDED: "Your account has been suspended. Contact support.",
        INACTIVE: "Your account is inactive.",
        DEACTIVATED: "Your account has been deactivated.",
      };
      return res.status(403).json({
        data: null,
        error: statusMessages[user.status] || "User account is not active.",
      });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        data: null,
        error: "Please verify your email first.",
      });
    }

    // Check password
    if (!user.password) {
      return res.status(401).json({
        data: null,
        error: "This account uses Google Sign-In. Please login with Google.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        data: null,
        error: "Invalid credentials.",
      });
    }

    // Generate tokens
    const payload: TokenPayload = {
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
      },
    });

    // Prepare farms data
    const ownedFarms = user.ownedFarms;
    const memberFarms = user.farmMemberships.map((membership) => ({
      ...membership.farm,
      membershipRole: membership.role,
      membershipPermissions: membership.permissions,
    }));

    return res.status(200).json({
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
      error: null,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      data: null,
      error: "An error occurred during login.",
    });
  }
}

/* ======================
   GET ALL USERS
   GET /api/v1/users
====================== */
export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (status) {
      where.status = status as UserStatus;
    }

    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: "insensitive" } },
        { phone: { contains: String(search) } },
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          phone: true,
          imageUrl: true,
          role: true,
          status: true,
          emailVerified: true,
          district: true,
          city: true,
          licenseNumber: true,
          specialization: true,
          yearsOfExperience: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedFarms: true,
              farmMemberships: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return res.status(200).json({
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to fetch users.",
    });
  }
}

/* ======================
   GET CURRENT USER
   GET /api/v1/users/me
====================== */
export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        data: null,
        error: "Unauthorized",
      });
    }

    const user = await db.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        status: true,
        imageUrl: true,
        role: true,
        district: true,
        city: true,
        address: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        preferredLanguage: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
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
            createdAt: true,
          },
          where: {
            status: "ACTIVE",
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
          where: {
            status: "ACTIVE",
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        data: null,
        error: "User not found.",
      });
    }

    const memberFarms = user.farmMemberships.map((membership) => ({
      ...membership.farm,
      membershipRole: membership.role,
      membershipPermissions: membership.permissions,
    }));

    return res.status(200).json({
      data: {
        ...user,
        farms: {
          owned: user.ownedFarms,
          member: memberFarms,
          total: user.ownedFarms.length + memberFarms.length,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      data: null,
      error: "Server error.",
    });
  }
}

/* ======================
   GET USER BY ID
   GET /api/v1/users/:id
====================== */
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        status: true,
        imageUrl: true,
        role: true,
        district: true,
        city: true,
        address: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        preferredLanguage: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
        ownedFarms: {
          select: {
            id: true,
            farmId: true,
            name: true,
            slug: true,
            status: true,
            farmType: true,
            totalAnimals: true,
          },
          where: {
            status: "ACTIVE",
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
                totalAnimals: true,
              },
            },
          },
          where: {
            status: "ACTIVE",
          },
        },
        _count: {
          select: {
            recordedHealthLogs: true,
            recordedWeights: true,
            recordedFeedings: true,
            recordedObservations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        data: null,
        error: "User not found.",
      });
    }

    const memberFarms = user.farmMemberships.map((membership) => ({
      ...membership.farm,
      membershipRole: membership.role,
      membershipPermissions: membership.permissions,
    }));

    return res.status(200).json({
      data: {
        ...user,
        farms: {
          owned: user.ownedFarms,
          member: memberFarms,
          total: user.ownedFarms.length + memberFarms.length,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching user by id:", error);
    return res.status(500).json({
      data: null,
      error: "Server error.",
    });
  }
}

/* ======================
   UPDATE USER
   PATCH /api/v1/users/:id
====================== */
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    email,
    phone,
    role,
    status,
    password,
    imageUrl,
    district,
    city,
    address,
    emailVerified,
    // Veterinarian fields
    licenseNumber,
    specialization,
    yearsOfExperience,
    // Preferences
    preferredLanguage,
    notificationsEnabled,
  } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: UserRole | string;
    status?: UserStatus | string;
    password?: string;
    imageUrl?: string;
    district?: string;
    city?: string;
    address?: string;
    emailVerified?: boolean;
    licenseNumber?: string;
    specialization?: string;
    yearsOfExperience?: number;
    preferredLanguage?: string;
    notificationsEnabled?: boolean;
  };

  try {
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({
        data: null,
        error: "User not found.",
      });
    }

    // Check for unique email/phone conflicts
    if (email || phone) {
      const emailNorm = email?.trim().toLowerCase();
      const phoneNorm = phone?.trim().replace(/\s+/g, "");

      const whereConditions = [];
      if (emailNorm) whereConditions.push({ email: emailNorm });
      if (phoneNorm) whereConditions.push({ phone: phoneNorm });

      const conflict = await db.user.findFirst({
        where: {
          OR: whereConditions,
          NOT: { id },
        },
        select: { id: true, email: true, phone: true },
      });

      if (conflict) {
        const field = conflict.email === emailNorm ? "email" : "phone";
        return res.status(409).json({
          data: null,
          error: `${field} already in use by another user.`,
        });
      }
    }

    // Validate role if provided
    const roleValue =
      role !== undefined ? (isValidRole(role) ? (role as UserRole) : undefined) : undefined;
    const statusValue =
      status !== undefined
        ? isValidStatus(status)
          ? (status as UserStatus)
          : undefined
        : undefined;

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : undefined;

    // Build name
    const nextFirst = firstName ?? existingUser.firstName;
    const nextLast = lastName ?? existingUser.lastName;
    const name = `${nextFirst} ${nextLast}`.trim();

    // Build update data
    const updateData: any = {
      firstName: nextFirst,
      lastName: nextLast,
      name,
      email: email ? email.trim().toLowerCase() : existingUser.email,
      phone: phone ? phone.trim().replace(/\s+/g, "") : existingUser.phone,
      imageUrl: imageUrl ?? existingUser.imageUrl,
      district: district !== undefined ? district : existingUser.district,
      city: city !== undefined ? city : existingUser.city,
      address: address !== undefined ? address : existingUser.address,
      emailVerified: emailVerified ?? existingUser.emailVerified,
      preferredLanguage: preferredLanguage ?? existingUser.preferredLanguage,
      notificationsEnabled: notificationsEnabled ?? existingUser.notificationsEnabled,
    };

    if (roleValue !== undefined) updateData.role = roleValue;
    if (statusValue !== undefined) updateData.status = statusValue;
    if (hashedPassword) updateData.password = hashedPassword;

    // Veterinarian-specific updates
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        imageUrl: true,
        emailVerified: true,
        district: true,
        city: true,
        address: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        preferredLanguage: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: id,
        action: "USER_UPDATED",
        module: "users",
        entityType: "User",
        entityId: id,
        status: "SUCCESS",
        description: `User updated: ${updatedUser.email}`,
      },
    });

    return res.status(200).json({ data: updatedUser, error: null });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to update user.",
    });
  }
}

/* ======================
   SOFT DELETE USER
   DELETE /api/v1/users/:id
====================== */
export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({
        data: null,
        error: "User not found.",
      });
    }

    // Check if user owns any active farms
    const ownedFarms = await db.farm.count({
      where: {
        ownerId: id,
        status: "ACTIVE",
      },
    });

    if (ownedFarms > 0) {
      return res.status(400).json({
        data: null,
        error: `Cannot delete user. They own ${ownedFarms} active farm(s). Transfer ownership first.`,
      });
    }

    // Soft delete: set status to DEACTIVATED
    await db.user.update({
      where: { id },
      data: { status: UserStatus.DEACTIVATED },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: req.user?.userId || id,
        action: "USER_DELETED",
        module: "users",
        entityType: "User",
        entityId: id,
        status: "SUCCESS",
        description: `User deactivated: ${existingUser.email}`,
      },
    });

    return res.status(200).json({
      data: null,
      message: "User deactivated successfully.",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to delete user.",
    });
  }
}

/* ======================
   GET USERS BY ROLE
   GET /api/v1/users/role/:role
====================== */
export async function getUsersByRole(req: Request, res: Response) {
  const { role } = req.params;

  try {
    if (!isValidRole(role)) {
      return res.status(400).json({
        data: null,
        error: "Invalid role.",
      });
    }

    const users = await db.user.findMany({
      where: {
        role: role as UserRole,
        status: "ACTIVE",
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        imageUrl: true,
        role: true,
        district: true,
        city: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        createdAt: true,
        _count: {
          select: {
            ownedFarms: true,
            farmMemberships: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      data: { users, count: users.length },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching users by role:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to fetch users.",
    });
  }
}

/* ======================
   GET VETERINARIANS
   GET /api/v1/users/veterinarians
====================== */
export async function getVeterinarians(req: Request, res: Response) {
  try {
    const { specialization, district } = req.query;

    const where: any = {
      role: UserRole.VETERINARIAN,
      status: "ACTIVE",
    };

    if (specialization) {
      where.specialization = {
        contains: String(specialization),
        mode: "insensitive",
      };
    }

    if (district) {
      where.district = String(district);
    }

    const vets = await db.user.findMany({
      where,
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        imageUrl: true,
        licenseNumber: true,
        specialization: true,
        yearsOfExperience: true,
        district: true,
        city: true,
        createdAt: true,
        _count: {
          select: {
            recordedHealthLogs: true,
            farmMemberships: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      data: { veterinarians: vets, count: vets.length },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching veterinarians:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to fetch veterinarians.",
    });
  }
}

/* ======================
   GET USER STATISTICS
   GET /api/v1/users/statistics
====================== */
export async function getUserStatistics(req: Request, res: Response) {
  try {
    const [
      totalUsers,
      activeUsers,
      farmers,
      veterinarians,
      caretakers,
      observers,
      pendingUsers,
      suspendedUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { role: UserRole.FARMER } }),
      db.user.count({ where: { role: UserRole.VETERINARIAN } }),
      db.user.count({ where: { role: UserRole.CARETAKER } }),
      db.user.count({ where: { role: UserRole.OBSERVER } }),
      db.user.count({ where: { status: "PENDING" } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
    ]);

    return res.status(200).json({
      data: {
        total: totalUsers,
        active: activeUsers,
        byRole: {
          farmers,
          veterinarians,
          caretakers,
          observers,
        },
        byStatus: {
          active: activeUsers,
          pending: pendingUsers,
          suspended: suspendedUsers,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return res.status(500).json({
      data: null,
      error: "Failed to fetch statistics.",
    });
  }
}