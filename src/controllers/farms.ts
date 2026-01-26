// import { Request, Response } from "express";
// import { db } from "@/db/db";
// import { UserRole, FarmStatus, FarmMemberRole, MemberStatus } from "@prisma/client";

// // ==================== HELPER FUNCTIONS ====================

// function generateSlug(name: string): string {
//   return name
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/(^-|-$)/g, "");
// }

// async function ensureUniqueSlug(baseSlug: string): Promise<string> {
//   let slug = baseSlug;
//   let counter = 1;
  
//   while (await db.farm.findUnique({ where: { slug } })) {
//     slug = `${baseSlug}-${counter}`;
//     counter++;
//   }
  
//   return slug;
// }

// function canAccessFarm(userId: string, farm: any, userRole: UserRole): boolean {
//   // Super admin can access all farms
//   if (userRole === UserRole.SUPER_ADMIN) return true;
  
//   // Farm owner can access their farm
//   if (farm.ownerId === userId) return true;
  
//   // Check if user is an active member
//   const membership = farm.members?.find(
//     (m: any) => m.userId === userId && m.status === MemberStatus.ACTIVE
//   );
  
//   return !!membership;
// }

// // ==================== CREATE FARM ====================

// /**
//  * Create a new farm (Farmer only)
//  * POST /api/v1/farms
//  */
// export async function createFarm(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;

//     // Only farmers can create farms
//     if (userRole !== UserRole.FARMER && userRole !== UserRole.SUPER_ADMIN) {
//       return res.status(403).json({
//         success: false,
//         error: "Only farmers can create farms",
//       });
//     }

//     const {
//       name,
//       description,
//       farmType,
//       farmCategories,
//       district,
//       city,
//       village,
//       subcounty,
//       parish,
//       address,
//       landmark,
//       latitude,
//       longitude,
//       sizeInAcres,
//       grazingType,
//       climateZone,
//       averageRainfall,
//       altitude,
//       temperatureRange,
//       paddockCount,
//       waterSources,
//       shelterType,
//       fencingType,
//       hasQuarantine,
//       hasMilkingParlor,
//       hasLoadingRamp,
//       hasColdStorage,
//     } = req.body;

//     // Validation
//     if (!name || !farmType || !district) {
//       return res.status(400).json({
//         success: false,
//         error: "Farm name, type, and district are required",
//       });
//     }

//     // Generate unique slug
//     const baseSlug = generateSlug(name);
//     const slug = await ensureUniqueSlug(baseSlug);

//     // Create farm
//     const farm = await db.farm.create({
//       data: {
//         name,
//         slug,
//         description: description || null,
//         farmType,
//         farmCategories: farmCategories || [],
        
//         // Location
//         district,
//         city: city || null,
//         village: village || null,
//         subcounty: subcounty || null,
//         parish: parish || null,
//         address: address || null,
//         landmark: landmark || null,
//         latitude: latitude ? parseFloat(latitude) : null,
//         longitude: longitude ? parseFloat(longitude) : null,
//         sizeInAcres: sizeInAcres ? parseFloat(sizeInAcres) : null,
        
//         // Ownership
//         ownerId: userId,
        
//         // Grazing
//         grazingType: grazingType || "SEMI_ZERO",
        
//         // Climate & Environment
//         climateZone: climateZone || null,
//         averageRainfall: averageRainfall ? parseFloat(averageRainfall) : null,
//         altitude: altitude ? parseFloat(altitude) : null,
//         temperatureRange: temperatureRange || null,
        
//         // Infrastructure
//         paddockCount: paddockCount ? parseInt(paddockCount) : 0,
//         waterSources: waterSources || [],
//         shelterType: shelterType || null,
//         fencingType: fencingType || null,
//         hasQuarantine: hasQuarantine || false,
//         hasMilkingParlor: hasMilkingParlor || false,
//         hasLoadingRamp: hasLoadingRamp || false,
//         hasColdStorage: hasColdStorage || false,
        
//         // Status
//         status: FarmStatus.ACTIVE,
//         isActive: true,
//       },
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId,
//         farmId: farm.id,
//         action: "FARM_CREATED",
//         module: "farms",
//         entityType: "Farm",
//         entityId: farm.id,
//         status: "SUCCESS",
//         description: `Farm created: ${farm.name}`,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Farm created successfully",
//       data: farm,
//     });
//   } catch (error) {
//     console.error("Create farm error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to create farm",
//     });
//   }
// }

// // ==================== GET ALL FARMS ====================

// /**
//  * Get all farms (with filtering and pagination)
//  * GET /api/v1/farms
//  */
// export async function getAllFarms(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;

//     const {
//       page = "1",
//       limit = "10",
//       status,
//       farmType,
//       district,
//       search,
//       ownedOnly,
//     } = req.query;

//     const pageNum = parseInt(page as string);
//     const limitNum = parseInt(limit as string);
//     const skip = (pageNum - 1) * limitNum;

//     // Build where clause
//     const where: any = {};

//     // Super admin sees all farms
//     // Farmers see their owned farms and farms they're members of
//     if (userRole !== UserRole.SUPER_ADMIN) {
//       if (ownedOnly === "true") {
//         where.ownerId = userId;
//       } else {
//         where.OR = [
//           { ownerId: userId },
//           {
//             members: {
//               some: {
//                 userId,
//                 status: MemberStatus.ACTIVE,
//               },
//             },
//           },
//         ];
//       }
//     }

//     // Filters
//     if (status) where.status = status;
//     if (farmType) where.farmType = farmType;
//     if (district) where.district = district;
//     if (search) {
//       where.OR = [
//         { name: { contains: search as string, mode: "insensitive" } },
//         { description: { contains: search as string, mode: "insensitive" } },
//       ];
//     }

//     // Get farms with pagination
//     const [farms, total] = await Promise.all([
//       db.farm.findMany({
//         where,
//         skip,
//         take: limitNum,
//         include: {
//           owner: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true,
//               phone: true,
//             },
//           },
//           members: {
//             where: { status: MemberStatus.ACTIVE },
//             select: {
//               id: true,
//               role: true,
//               user: {
//                 select: {
//                   id: true,
//                   firstName: true,
//                   lastName: true,
//                   email: true,
//                 },
//               },
//             },
//           },
//           _count: {
//             select: {
//               animals: true,
//               paddocks: true,
//               members: true,
//             },
//           },
//         },
//         orderBy: { createdAt: "desc" },
//       }),
//       db.farm.count({ where }),
//     ]);

//     return res.status(200).json({
//       success: true,
//       data: {
//         farms,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           totalPages: Math.ceil(total / limitNum),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get all farms error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to fetch farms",
//     });
//   }
// }

// // ==================== GET FARM BY SLUG ====================

// /**
//  * Get farm details by slug
//  * GET /api/v1/farms/:slug
//  */
// export async function getFarmBySlug(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug } = req.params;

//     const farm = await db.farm.findUnique({
//       where: { slug },
//       include: {
//         owner: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//             phone: true,
//             imageUrl: true,
//           },
//         },
//         members: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 firstName: true,
//                 lastName: true,
//                 email: true,
//                 phone: true,
//                 imageUrl: true,
//                 role: true,
//               },
//             },
//           },
//           orderBy: { createdAt: "desc" },
//         },
//         paddocks: {
//           select: {
//             id: true,
//             name: true,
//             number: true,
//             sizeInAcres: true,
//             status: true,
//             isOccupied: true,
//           },
//         },
//         _count: {
//           select: {
//             animals: true,
//             paddocks: true,
//             members: true,
//             healthRecords: true,
//             productionRecords: true,
//           },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Check access permission
//     if (!canAccessFarm(userId, farm, userRole)) {
//       return res.status(403).json({
//         success: false,
//         error: "You don't have permission to access this farm",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: farm,
//     });
//   } catch (error) {
//     console.error("Get farm by slug error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to fetch farm",
//     });
//   }
// }

// // ==================== UPDATE FARM ====================

// /**
//  * Update farm details
//  * PATCH /api/v1/farms/:slug
//  */
// export async function updateFarm(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug } = req.params;

//     const farm = await db.farm.findUnique({
//       where: { slug },
//       include: {
//         members: true,
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Check permission (owner, manager, or super admin)
//     const isOwner = farm.ownerId === userId;
//     const isManager = farm.members.some(
//       (m) =>
//         m.userId === userId &&
//         m.role === FarmMemberRole.MANAGER &&
//         m.status === MemberStatus.ACTIVE
//     );
//     const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

//     if (!isOwner && !isManager && !isSuperAdmin) {
//       return res.status(403).json({
//         success: false,
//         error: "You don't have permission to update this farm",
//       });
//     }

//     const {
//       name,
//       description,
//       farmType,
//       farmCategories,
//       district,
//       city,
//       village,
//       subcounty,
//       parish,
//       address,
//       landmark,
//       latitude,
//       longitude,
//       sizeInAcres,
//       grazingType,
//       climateZone,
//       averageRainfall,
//       altitude,
//       temperatureRange,
//       paddockCount,
//       waterSources,
//       shelterType,
//       fencingType,
//       hasQuarantine,
//       hasMilkingParlor,
//       hasLoadingRamp,
//       hasColdStorage,
//     } = req.body;

//     const updateData: any = {};

//     // Update fields if provided
//     if (name) {
//       updateData.name = name;
//       const baseSlug = generateSlug(name);
//       if (baseSlug !== slug) {
//         updateData.slug = await ensureUniqueSlug(baseSlug);
//       }
//     }
//     if (description !== undefined) updateData.description = description;
//     if (farmType) updateData.farmType = farmType;
//     if (farmCategories) updateData.farmCategories = farmCategories;
//     if (district) updateData.district = district;
//     if (city !== undefined) updateData.city = city;
//     if (village !== undefined) updateData.village = village;
//     if (subcounty !== undefined) updateData.subcounty = subcounty;
//     if (parish !== undefined) updateData.parish = parish;
//     if (address !== undefined) updateData.address = address;
//     if (landmark !== undefined) updateData.landmark = landmark;
//     if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
//     if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
//     if (sizeInAcres !== undefined) updateData.sizeInAcres = parseFloat(sizeInAcres);
//     if (grazingType) updateData.grazingType = grazingType;
//     if (climateZone !== undefined) updateData.climateZone = climateZone;
//     if (averageRainfall !== undefined) updateData.averageRainfall = parseFloat(averageRainfall);
//     if (altitude !== undefined) updateData.altitude = parseFloat(altitude);
//     if (temperatureRange !== undefined) updateData.temperatureRange = temperatureRange;
//     if (paddockCount !== undefined) updateData.paddockCount = parseInt(paddockCount);
//     if (waterSources) updateData.waterSources = waterSources;
//     if (shelterType !== undefined) updateData.shelterType = shelterType;
//     if (fencingType !== undefined) updateData.fencingType = fencingType;
//     if (hasQuarantine !== undefined) updateData.hasQuarantine = hasQuarantine;
//     if (hasMilkingParlor !== undefined) updateData.hasMilkingParlor = hasMilkingParlor;
//     if (hasLoadingRamp !== undefined) updateData.hasLoadingRamp = hasLoadingRamp;
//     if (hasColdStorage !== undefined) updateData.hasColdStorage = hasColdStorage;

//     const updatedFarm = await db.farm.update({
//       where: { slug },
//       data: updateData,
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId,
//         farmId: farm.id,
//         action: "FARM_UPDATED",
//         module: "farms",
//         entityType: "Farm",
//         entityId: farm.id,
//         status: "SUCCESS",
//         description: `Farm updated: ${updatedFarm.name}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Farm updated successfully",
//       data: updatedFarm,
//     });
//   } catch (error) {
//     console.error("Update farm error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to update farm",
//     });
//   }
// }

// // ==================== DELETE FARM ====================

// /**
//  * Delete farm (soft delete by setting status to INACTIVE)
//  * DELETE /api/v1/farms/:slug
//  */
// export async function deleteFarm(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug } = req.params;

//     const farm = await db.farm.findUnique({
//       where: { slug },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Only owner or super admin can delete
//     if (farm.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
//       return res.status(403).json({
//         success: false,
//         error: "Only the farm owner can delete this farm",
//       });
//     }

//     // Soft delete
//     await db.farm.update({
//       where: { slug },
//       data: {
//         status: FarmStatus.INACTIVE,
//         isActive: false,
//       },
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId,
//         farmId: farm.id,
//         action: "FARM_DELETED",
//         module: "farms",
//         entityType: "Farm",
//         entityId: farm.id,
//         status: "SUCCESS",
//         description: `Farm deleted: ${farm.name}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Farm deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete farm error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to delete farm",
//     });
//   }
// }

// // ==================== GET FARM STATISTICS ====================

// /**
//  * Get farm statistics and analytics
//  * GET /api/v1/farms/:slug/stats
//  */
// export async function getFarmStats(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug } = req.params;

//     const farm = await db.farm.findUnique({
//       where: { slug },
//       include: {
//         members: true,
//         animals: {
//           select: {
//             category: true,
//             currentStatus: true,
//             primaryPurpose: true,
//           },
//         },
//         paddocks: {
//           select: {
//             status: true,
//             isOccupied: true,
//           },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Check access
//     if (!canAccessFarm(userId, farm, userRole)) {
//       return res.status(403).json({
//         success: false,
//         error: "You don't have permission to access this farm",
//       });
//     }

//     // Calculate statistics
//     const stats = {
//       totalAnimals: farm.animals.length,
//       animalsByCategory: farm.animals.reduce((acc: any, animal) => {
//         acc[animal.category] = (acc[animal.category] || 0) + 1;
//         return acc;
//       }, {}),
//       animalsByStatus: farm.animals.reduce((acc: any, animal) => {
//         acc[animal.currentStatus] = (acc[animal.currentStatus] || 0) + 1;
//         return acc;
//       }, {}),
//       animalsByPurpose: farm.animals.reduce((acc: any, animal) => {
//         acc[animal.primaryPurpose] = (acc[animal.primaryPurpose] || 0) + 1;
//         return acc;
//       }, {}),
//       totalPaddocks: farm.paddocks.length,
//       occupiedPaddocks: farm.paddocks.filter((p) => p.isOccupied).length,
//       availablePaddocks: farm.paddocks.filter((p) => p.status === "AVAILABLE").length,
//       totalMembers: farm.members.filter((m) => m.status === MemberStatus.ACTIVE).length,
//       farmInfo: {
//         name: farm.name,
//         farmType: farm.farmType,
//         district: farm.district,
//         sizeInAcres: farm.sizeInAcres,
//         subscriptionTier: farm.subscriptionTier,
//       },
//     };

//     return res.status(200).json({
//       success: true,
//       data: stats,
//     });
//   } catch (error) {
//     console.error("Get farm stats error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to fetch farm statistics",
//     });
//   }
// }

// // ==================== INVITE MEMBER TO FARM ====================

// /**
//  * Invite a user to join farm as a member
//  * POST /api/v1/farms/:slug/members/invite
//  */
// export async function inviteMember(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug } = req.params;
//     const { email, role, permissions, specialty } = req.body;

//     if (!email || !role) {
//       return res.status(400).json({
//         success: false,
//         error: "Email and role are required",
//       });
//     }

//     const farm = await db.farm.findUnique({
//       where: { slug },
//       include: { members: true },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Check permission (owner, manager, or super admin)
//     const isOwner = farm.ownerId === userId;
//     const isManager = farm.members.some(
//       (m) =>
//         m.userId === userId &&
//         m.role === FarmMemberRole.MANAGER &&
//         m.status === MemberStatus.ACTIVE
//     );

//     if (!isOwner && !isManager && userRole !== UserRole.SUPER_ADMIN) {
//       return res.status(403).json({
//         success: false,
//         error: "You don't have permission to invite members",
//       });
//     }

//     // Find user by email
//     const invitedUser = await db.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });

//     if (!invitedUser) {
//       return res.status(404).json({
//         success: false,
//         error: "User not found with this email",
//       });
//     }

//     // Check if already a member
//     const existingMembership = farm.members.find((m) => m.userId === invitedUser.id);

//     if (existingMembership) {
//       return res.status(409).json({
//         success: false,
//         error: "User is already a member of this farm",
//       });
//     }

//     // Create membership
//     const membership = await db.farmMember.create({
//       data: {
//         farmId: farm.id,
//         userId: invitedUser.id,
//         role,
//         permissions: permissions || [],
//         specialty: specialty || null,
//         status: MemberStatus.PENDING,
//       },
//       include: {
//         user: {
//           select: {
//             id: true,
//             firstName: true,
//             lastName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     // Create notification
//     await db.notification.create({
//       data: {
//         userId: invitedUser.id,
//         type: "MEMBER_JOINED",
//         title: "Farm Invitation",
//         message: `You've been invited to join ${farm.name} as a ${role}`,
//         farmId: farm.id,
//         priority: "NORMAL",
//       },
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId,
//         farmId: farm.id,
//         action: "MEMBER_INVITED",
//         module: "farms",
//         entityType: "FarmMember",
//         entityId: membership.id,
//         status: "SUCCESS",
//         description: `Member invited: ${invitedUser.email} as ${role}`,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Member invited successfully",
//       data: membership,
//     });
//   } catch (error) {
//     console.error("Invite member error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to invite member",
//     });
//   }
// }

// // ==================== REMOVE FARM MEMBER ====================

// /**
//  * Remove a member from the farm
//  * DELETE /api/v1/farms/:slug/members/:memberId
//  */
// export async function removeMember(req: Request, res: Response) {
//   try {
//     const userId = (req as any).user?.userId;
//     const userRole = (req as any).user?.role;
//     const { slug, memberId } = req.params;

//     const farm = await db.farm.findUnique({
//       where: { slug },
//       include: { members: true },
//     });

//     if (!farm) {
//       return res.status(404).json({
//         success: false,
//         error: "Farm not found",
//       });
//     }

//     // Check permission
//     const isOwner = farm.ownerId === userId;
//     const isManager = farm.members.some(
//       (m) =>
//         m.userId === userId &&
//         m.role === FarmMemberRole.MANAGER &&
//         m.status === MemberStatus.ACTIVE
//     );

//     if (!isOwner && !isManager && userRole !== UserRole.SUPER_ADMIN) {
//       return res.status(403).json({
//         success: false,
//         error: "You don't have permission to remove members",
//       });
//     }

//     const membership = await db.farmMember.findUnique({
//       where: { id: memberId },
//       include: { user: true },
//     });

//     if (!membership || membership.farmId !== farm.id) {
//       return res.status(404).json({
//         success: false,
//         error: "Member not found",
//       });
//     }

//     // Can't remove the owner
//     if (membership.role === FarmMemberRole.OWNER) {
//       return res.status(400).json({
//         success: false,
//         error: "Cannot remove farm owner",
//       });
//     }

//     // Update status to REMOVED
//     await db.farmMember.update({
//       where: { id: memberId },
//       data: { status: MemberStatus.REMOVED },
//     });

//     // Create notification
//     await db.notification.create({
//       data: {
//         userId: membership.userId,
//         type: "MEMBER_LEFT",
//         title: "Removed from Farm",
//         message: `You have been removed from ${farm.name}`,
//         farmId: farm.id,
//       },
//     });

//     // Log activity
//     await db.activityLog.create({
//       data: {
//         userId,
//         farmId: farm.id,
//         action: "MEMBER_REMOVED",
//         module: "farms",
//         entityType: "FarmMember",
//         entityId: memberId,
//         status: "SUCCESS",
//         description: `Member removed: ${membership.user.email}`,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Member removed successfully",
//     });
//   } catch (error) {
//     console.error("Remove member error:", error);
//     return res.status(500).json({
//       success: false,
//       error: "Failed to remove member",
//     });
//   }
// }


























// controllers/farms.ts
import { Request, Response } from "express";
import { db } from "@/db/db";
import { UserRole, FarmStatus, FarmMemberRole, MemberStatus } from "@prisma/client";

// ==================== HELPER FUNCTIONS ====================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (await db.farm.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

function canAccessFarm(userId: string, farm: any, userRole: UserRole): boolean {
  // Super admin can access all farms
  if (userRole === UserRole.SUPER_ADMIN) return true;
  
  // Farm owner can access their farm
  if (farm.ownerId === userId) return true;
  
  // Check if user is an active member
  const membership = farm.members?.find(
    (m: any) => m.userId === userId && m.status === MemberStatus.ACTIVE
  );
  
  return !!membership;
}

// ==================== CREATE FARM ====================

/**
 * Create a new farm (Farmer only)
 * POST /api/v1/farms
 * 
 * 
 */



export async function createFarm(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    // const userRole = req.user?.role;
    const userRole = req.user?.role as UserRole;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }



    // Only farmers can create farms
    if (userRole !== UserRole.FARMER && userRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "Only farmers can create farms",
      });
    }

    const {
      name,
      description,
      farmType,
      farmCategories,
      district,
      city,
      village,
      subcounty,
      parish,
      address,
      landmark,
      latitude,
      longitude,
      sizeInAcres,
      grazingType,
      climateZone,
      averageRainfall,
      altitude,
      temperatureRange,
      paddockCount,
      waterSources,
      shelterType,
      fencingType,
      hasQuarantine,
      hasMilkingParlor,
      hasLoadingRamp,
      hasColdStorage,
    } = req.body;

    // Validation
    if (!name || !farmType || !district) {
      return res.status(400).json({
        success: false,
        error: "Farm name, type, and district are required",
      });
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create farm
    const farm = await db.farm.create({
      data: {
        name,
        slug,
        description: description || null,
        farmType,
        farmCategories: farmCategories || [],
        
        // Location
        district,
        city: city || null,
        village: village || null,
        subcounty: subcounty || null,
        parish: parish || null,
        address: address || null,
        landmark: landmark || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        sizeInAcres: sizeInAcres ? parseFloat(sizeInAcres) : null,
        
        // Ownership
        ownerId: userId,
        
        // Grazing
        grazingType: grazingType || "SEMI_ZERO",
        
        // Climate & Environment
        climateZone: climateZone || null,
        averageRainfall: averageRainfall ? parseFloat(averageRainfall) : null,
        altitude: altitude ? parseFloat(altitude) : null,
        temperatureRange: temperatureRange || null,
        
        // Infrastructure
        paddockCount: paddockCount ? parseInt(paddockCount) : 0,
        waterSources: waterSources || [],
        shelterType: shelterType || null,
        fencingType: fencingType || null,
        hasQuarantine: hasQuarantine || false,
        hasMilkingParlor: hasMilkingParlor || false,
        hasLoadingRamp: hasLoadingRamp || false,
        hasColdStorage: hasColdStorage || false,
        
        // Status
        status: FarmStatus.ACTIVE,
        isActive: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId: farm.id,
        action: "FARM_CREATED",
        module: "farms",
        entityType: "Farm",
        entityId: farm.id,
        status: "SUCCESS",
        description: `Farm created: ${farm.name}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Farm created successfully",
      data: farm,
    });
  } catch (error) {
    console.error("Create farm error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create farm",
    });
  }
}

// ==================== GET ALL FARMS ====================

/**
 * Get all farms (with filtering and pagination)
 * GET /api/v1/farms
 */
export async function getAllFarms(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const {
      page = "1",
      limit = "10",
      status,
      farmType,
      district,
      search,
      ownedOnly,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Super admin sees all farms
    // Farmers see their owned farms and farms they're members of
    if (userRole !== UserRole.SUPER_ADMIN) {
      if (ownedOnly === "true") {
        where.ownerId = userId;
      } else {
        where.OR = [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                status: MemberStatus.ACTIVE,
              },
            },
          },
        ];
      }
    }

    // Filters
    if (status) where.status = status;
    if (farmType) where.farmType = farmType;
    if (district) where.district = district;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Get farms with pagination
    const [farms, total] = await Promise.all([
      db.farm.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          members: {
            where: { status: MemberStatus.ACTIVE },
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              animals: true,
              paddocks: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.farm.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        farms,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Get all farms error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch farms",
    });
  }
}

// ==================== GET FARM BY SLUG ====================

/**
 * Get farm details by slug
 * GET /api/v1/farms/:slug
 */
export async function getFarmBySlug(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;

    console.log("=== GET FARM BY SLUG ===");
    console.log("Slug:", slug);
    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!userId) {
      console.log("ERROR: No user ID");
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                imageUrl: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        paddocks: {
          select: {
            id: true,
            name: true,
            number: true,
            sizeInAcres: true,
            status: true,
            isOccupied: true,
          },
        },
        _count: {
          select: {
            animals: true,
            paddocks: true,
            members: true,
            healthRecords: true,
            productionRecords: true,
          },
        },
      },
    });

    console.log("Farm found:", farm ? `Yes (${farm.name})` : "No");

    if (!farm) {
      console.log("ERROR: Farm not found with slug:", slug);
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    console.log("Farm owner ID:", farm.ownerId);
    console.log("Members count:", farm.members.length);

    // Check access permission
    if (!canAccessFarm(userId, farm, userRole as UserRole)) {
      console.log("ERROR: Access denied - user is not owner or member");
      return res.status(403).json({
        success: false,
        error: "You don't have permission to access this farm",
      });
    }

    console.log("SUCCESS: Access granted, returning farm data");

    return res.status(200).json({
      success: true,
      data: farm,
    });
  } catch (error) {
    console.error("Get farm by slug error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch farm",
    });
  }
}

// ==================== UPDATE FARM ====================

/**
 * Update farm details
 * PATCH /api/v1/farms/:slug
 */
export async function updateFarm(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
      include: {
        members: true,
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Check permission (owner, manager, or super admin)
    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.some(
      (m) =>
        m.userId === userId &&
        m.role === FarmMemberRole.MANAGER &&
        m.status === MemberStatus.ACTIVE
    );
    const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

    if (!isOwner && !isManager && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to update this farm",
      });
    }

    const {
      name,
      description,
      farmType,
      farmCategories,
      district,
      city,
      village,
      subcounty,
      parish,
      address,
      landmark,
      latitude,
      longitude,
      sizeInAcres,
      grazingType,
      climateZone,
      averageRainfall,
      altitude,
      temperatureRange,
      paddockCount,
      waterSources,
      shelterType,
      fencingType,
      hasQuarantine,
      hasMilkingParlor,
      hasLoadingRamp,
      hasColdStorage,
    } = req.body;

    const updateData: any = {};

    // Update fields if provided
    if (name) {
      updateData.name = name;
      const baseSlug = generateSlug(name);
      if (baseSlug !== slug) {
        updateData.slug = await ensureUniqueSlug(baseSlug);
      }
    }
    if (description !== undefined) updateData.description = description;
    if (farmType) updateData.farmType = farmType;
    if (farmCategories) updateData.farmCategories = farmCategories;
    if (district) updateData.district = district;
    if (city !== undefined) updateData.city = city;
    if (village !== undefined) updateData.village = village;
    if (subcounty !== undefined) updateData.subcounty = subcounty;
    if (parish !== undefined) updateData.parish = parish;
    if (address !== undefined) updateData.address = address;
    if (landmark !== undefined) updateData.landmark = landmark;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (sizeInAcres !== undefined) updateData.sizeInAcres = parseFloat(sizeInAcres);
    if (grazingType) updateData.grazingType = grazingType;
    if (climateZone !== undefined) updateData.climateZone = climateZone;
    if (averageRainfall !== undefined) updateData.averageRainfall = parseFloat(averageRainfall);
    if (altitude !== undefined) updateData.altitude = parseFloat(altitude);
    if (temperatureRange !== undefined) updateData.temperatureRange = temperatureRange;
    if (paddockCount !== undefined) updateData.paddockCount = parseInt(paddockCount);
    if (waterSources) updateData.waterSources = waterSources;
    if (shelterType !== undefined) updateData.shelterType = shelterType;
    if (fencingType !== undefined) updateData.fencingType = fencingType;
    if (hasQuarantine !== undefined) updateData.hasQuarantine = hasQuarantine;
    if (hasMilkingParlor !== undefined) updateData.hasMilkingParlor = hasMilkingParlor;
    if (hasLoadingRamp !== undefined) updateData.hasLoadingRamp = hasLoadingRamp;
    if (hasColdStorage !== undefined) updateData.hasColdStorage = hasColdStorage;

    const updatedFarm = await db.farm.update({
      where: { slug },
      data: updateData,
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId: farm.id,
        action: "FARM_UPDATED",
        module: "farms",
        entityType: "Farm",
        entityId: farm.id,
        status: "SUCCESS",
        description: `Farm updated: ${updatedFarm.name}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Farm updated successfully",
      data: updatedFarm,
    });
  } catch (error) {
    console.error("Update farm error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update farm",
    });
  }
}

// ==================== DELETE FARM ====================

/**
 * Delete farm (soft delete by setting status to INACTIVE)
 * DELETE /api/v1/farms/:slug
 */
export async function deleteFarm(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Only owner or super admin can delete
    if (farm.ownerId !== userId && userRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "Only the farm owner can delete this farm",
      });
    }

    // Soft delete
    await db.farm.update({
      where: { slug },
      data: {
        status: FarmStatus.INACTIVE,
        isActive: false,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId: farm.id,
        action: "FARM_DELETED",
        module: "farms",
        entityType: "Farm",
        entityId: farm.id,
        status: "SUCCESS",
        description: `Farm deleted: ${farm.name}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Farm deleted successfully",
    });
  } catch (error) {
    console.error("Delete farm error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete farm",
    });
  }
}

// ==================== GET FARM STATISTICS ====================

/**
 * Get farm statistics and analytics
 * GET /api/v1/farms/:slug/stats
 */
export async function getFarmStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
      include: {
        members: true,
        animals: {
          select: {
            category: true,
            currentStatus: true,
            primaryPurpose: true,
          },
        },
        paddocks: {
          select: {
            status: true,
            isOccupied: true,
          },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Check access
    if (!canAccessFarm(userId, farm, userRole as UserRole)) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to access this farm",
      });
    }

    // Calculate statistics
    const stats = {
      totalAnimals: farm.animals.length,
      animalsByCategory: farm.animals.reduce((acc: any, animal) => {
        acc[animal.category] = (acc[animal.category] || 0) + 1;
        return acc;
      }, {}),
      animalsByStatus: farm.animals.reduce((acc: any, animal) => {
        acc[animal.currentStatus] = (acc[animal.currentStatus] || 0) + 1;
        return acc;
      }, {}),
      animalsByPurpose: farm.animals.reduce((acc: any, animal) => {
        acc[animal.primaryPurpose] = (acc[animal.primaryPurpose] || 0) + 1;
        return acc;
      }, {}),
      totalPaddocks: farm.paddocks.length,
      occupiedPaddocks: farm.paddocks.filter((p) => p.isOccupied).length,
      availablePaddocks: farm.paddocks.filter((p) => p.status === "AVAILABLE").length,
      totalMembers: farm.members.filter((m) => m.status === MemberStatus.ACTIVE).length,
      farmInfo: {
        name: farm.name,
        farmType: farm.farmType,
        district: farm.district,
        sizeInAcres: farm.sizeInAcres,
        subscriptionTier: farm.subscriptionTier,
      },
    };

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get farm stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch farm statistics",
    });
  }
}

// ==================== INVITE MEMBER TO FARM ====================

/**
 * Invite a user to join farm as a member
 * POST /api/v1/farms/:slug/members/invite
 */
export async function inviteMember(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug } = req.params;
    const { email, role, permissions, specialty } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: "Email and role are required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Check permission (owner, manager, or super admin)
    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.some(
      (m) =>
        m.userId === userId &&
        m.role === FarmMemberRole.MANAGER &&
        m.status === MemberStatus.ACTIVE
    );

    if (!isOwner && !isManager && userRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to invite members",
      });
    }

    // Find user by email
    const invitedUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!invitedUser) {
      return res.status(404).json({
        success: false,
        error: "User not found with this email",
      });
    }

    // Check if already a member
    const existingMembership = farm.members.find((m) => m.userId === invitedUser.id);

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        error: "User is already a member of this farm",
      });
    }

    // Create membership
    const membership = await db.farmMember.create({
      data: {
        farmId: farm.id,
        userId: invitedUser.id,
        role,
        permissions: permissions || [],
        specialty: specialty || null,
        status: MemberStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: invitedUser.id,
        type: "MEMBER_JOINED",
        title: "Farm Invitation",
        message: `You've been invited to join ${farm.name} as a ${role}`,
        farmId: farm.id,
        priority: "NORMAL",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId: farm.id,
        action: "MEMBER_INVITED",
        module: "farms",
        entityType: "FarmMember",
        entityId: membership.id,
        status: "SUCCESS",
        description: `Member invited: ${invitedUser.email} as ${role}`,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Member invited successfully",
      data: membership,
    });
  } catch (error) {
    console.error("Invite member error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to invite member",
    });
  }
}

// ==================== REMOVE FARM MEMBER ====================

/**
 * Remove a member from the farm
 * DELETE /api/v1/farms/:slug/members/:memberId
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { slug, memberId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const farm = await db.farm.findUnique({
      where: { slug },
      include: { members: true },
    });

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: "Farm not found",
      });
    }

    // Check permission
    const isOwner = farm.ownerId === userId;
    const isManager = farm.members.some(
      (m) =>
        m.userId === userId &&
        m.role === FarmMemberRole.MANAGER &&
        m.status === MemberStatus.ACTIVE
    );

    if (!isOwner && !isManager && userRole !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to remove members",
      });
    }

    const membership = await db.farmMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!membership || membership.farmId !== farm.id) {
      return res.status(404).json({
        success: false,
        error: "Member not found",
      });
    }

    // Can't remove the owner
    if (membership.role === FarmMemberRole.OWNER) {
      return res.status(400).json({
        success: false,
        error: "Cannot remove farm owner",
      });
    }

    // Update status to REMOVED
    await db.farmMember.update({
      where: { id: memberId },
      data: { status: MemberStatus.REMOVED },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: membership.userId,
        type: "MEMBER_LEFT",
        title: "Removed from Farm",
        message: `You have been removed from ${farm.name}`,
        farmId: farm.id,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        farmId: farm.id,
        action: "MEMBER_REMOVED",
        module: "farms",
        entityType: "FarmMember",
        entityId: memberId,
        status: "SUCCESS",
        description: `Member removed: ${membership.user.email}`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to remove member",
    });
  }
}