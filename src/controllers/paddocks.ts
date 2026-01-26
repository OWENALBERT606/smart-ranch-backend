// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// // ==================== CREATE PADDOCK ====================
// export const createPaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId } = req.params;
//     const {
//       name,
//       number,
//       sizeInAcres,
//       grassType,
//       grassHeight,
//       soilCondition,
//       lastSoilTest,
//       isOccupied,
//       currentAnimalIds,
//       lastGrazedDate,
//       nextGrazingDate,
//       recommendedRest,
//       hasWaterSource,
//       hasShelter,
//       hasSaltLick,
//       hasMineralLick,
//       lastMaintenance,
//       maintenanceNotes,
//       status,
//     } = req.body;
//     const currentUserId = req.user?.userId;

//     // Verify farm exists and user has permission
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     const currentMember = farm.members[0];
//     const hasPermission =
//       farm.ownerId === currentUserId ||
//       currentMember?.role === "MANAGER" ||
//       currentMember?.permissions.includes("manage_paddocks");

//     if (!hasPermission) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to create paddocks" });
//     }

//     const paddock = await prisma.paddock.create({
//       data: {
//         farmId,
//         name,
//         number,
//         sizeInAcres,
//         grassType,
//         grassHeight,
//         soilCondition,
//         lastSoilTest: lastSoilTest ? new Date(lastSoilTest) : null,
//         isOccupied: isOccupied || false,
//         currentAnimalIds: currentAnimalIds || [],
//         lastGrazedDate: lastGrazedDate ? new Date(lastGrazedDate) : null,
//         nextGrazingDate: nextGrazingDate ? new Date(nextGrazingDate) : null,
//         recommendedRest: recommendedRest || 21,
//         hasWaterSource: hasWaterSource || false,
//         hasShelter: hasShelter || false,
//         hasSaltLick: hasSaltLick || false,
//         hasMineralLick: hasMineralLick || false,
//         lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
//         maintenanceNotes,
//         status: status || "AVAILABLE",
//       },
//     });

//     // Update farm paddock count
//     await prisma.farm.update({
//       where: { id: farmId },
//       data: { paddockCount: { increment: 1 } },
//     });

//     // Log activity
//     await prisma.activityLog.create({
//       data: {
//         userId: currentUserId,
//         farmId,
//         action: "CREATE_PADDOCK",
//         module: "PADDOCKS",
//         entityType: "Paddock",
//         entityId: paddock.id,
//         description: `Created paddock: ${name}`,
//       },
//     });

//     res.status(201).json({
//       message: "Paddock created successfully",
//       data: paddock,
//     });
//   } catch (error: any) {
//     console.error("Create paddock error:", error);
//     res.status(500).json({ error: "Failed to create paddock" });
//   }
// };

// // ==================== GET ALL PADDOCKS ====================
// export const getPaddocks = async (req: Request, res: Response) => {
//   try {
//     const { farmId } = req.params;
//     const { status, isOccupied, hasWaterSource } = req.query;
//     const currentUserId = req.user?.id;

//     // Verify access
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     if (farm.ownerId !== currentUserId && !farm.members.length) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const where: any = { farmId };
//     if (status) where.status = status;
//     if (isOccupied !== undefined) where.isOccupied = isOccupied === "true";
//     if (hasWaterSource !== undefined)
//       where.hasWaterSource = hasWaterSource === "true";

//     const paddocks = await prisma.paddock.findMany({
//       where,
//       include: {
//         grazingHistory: {
//           take: 5,
//           orderBy: { startDate: "desc" },
//         },
//         pastureSoilTests: {
//           take: 1,
//           orderBy: { date: "desc" },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//     });

//     const total = await prisma.paddock.count({ where });

//     res.json({
//       data: {
//         paddocks,
//         total,
//       },
//     });
//   } catch (error: any) {
//     console.error("Get paddocks error:", error);
//     res.status(500).json({ error: "Failed to fetch paddocks" });
//   }
// };

// // ==================== GET SINGLE PADDOCK ====================
// export const getPaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId, paddockId } = req.params;
//     const currentUserId = req.user?.id;

//     // Verify access
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     if (farm.ownerId !== currentUserId && !farm.members.length) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const paddock = await prisma.paddock.findUnique({
//       where: { id: paddockId },
//       include: {
//         grazingHistory: {
//           orderBy: { startDate: "desc" },
//         },
//         pastureSoilTests: {
//           orderBy: { date: "desc" },
//         },
//       },
//     });

//     if (!paddock || paddock.farmId !== farmId) {
//       return res.status(404).json({ error: "Paddock not found" });
//     }

//     // Get animals currently in paddock
//     const animals = await prisma.animal.findMany({
//       where: {
//         id: { in: paddock.currentAnimalIds },
//       },
//       select: {
//         id: true,
//         tagNumber: true,
//         name: true,
//         category: true,
//         breed: true,
//         currentWeight: true,
//       },
//     });

//     res.json({
//       data: {
//         ...paddock,
//         currentAnimals: animals,
//       },
//     });
//   } catch (error: any) {
//     console.error("Get paddock error:", error);
//     res.status(500).json({ error: "Failed to fetch paddock" });
//   }
// };

// // ==================== UPDATE PADDOCK ====================
// export const updatePaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId, paddockId } = req.params;
//     const updateData = req.body;
//     const currentUserId = req.user?.id;

//     // Verify permission
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     const currentMember = farm.members[0];
//     const hasPermission =
//       farm.ownerId === currentUserId ||
//       currentMember?.role === "MANAGER" ||
//       currentMember?.permissions.includes("manage_paddocks");

//     if (!hasPermission) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to update paddocks" });
//     }

//     // Process date fields
//     const processedData: any = { ...updateData };
//     if (updateData.lastSoilTest) {
//       processedData.lastSoilTest = new Date(updateData.lastSoilTest);
//     }
//     if (updateData.lastGrazedDate) {
//       processedData.lastGrazedDate = new Date(updateData.lastGrazedDate);
//     }
//     if (updateData.nextGrazingDate) {
//       processedData.nextGrazingDate = new Date(updateData.nextGrazingDate);
//     }
//     if (updateData.lastMaintenance) {
//       processedData.lastMaintenance = new Date(updateData.lastMaintenance);
//     }

//     const paddock = await prisma.paddock.update({
//       where: { id: paddockId },
//       data: processedData,
//     });

//     // Log activity
//     await prisma.activityLog.create({
//       data: {
//         userId: currentUserId,
//         farmId,
//         action: "UPDATE_PADDOCK",
//         module: "PADDOCKS",
//         entityType: "Paddock",
//         entityId: paddockId,
//         description: `Updated paddock: ${paddock.name}`,
//         metadata: updateData,
//       },
//     });

//     res.json({
//       message: "Paddock updated successfully",
//       data: paddock,
//     });
//   } catch (error: any) {
//     console.error("Update paddock error:", error);
//     res.status(500).json({ error: "Failed to update paddock" });
//   }
// };

// // ==================== DELETE PADDOCK ====================
// export const deletePaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId, paddockId } = req.params;
//     const currentUserId = req.user?.id;

//     // Verify permission
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     const currentMember = farm.members[0];
//     const hasPermission =
//       farm.ownerId === currentUserId || currentMember?.role === "MANAGER";

//     if (!hasPermission) {
//       return res
//         .status(403)
//         .json({ error: "Only farm owner or manager can delete paddocks" });
//     }

//     const paddock = await prisma.paddock.findUnique({
//       where: { id: paddockId },
//     });

//     if (!paddock || paddock.farmId !== farmId) {
//       return res.status(404).json({ error: "Paddock not found" });
//     }

//     if (paddock.isOccupied) {
//       return res
//         .status(400)
//         .json({ error: "Cannot delete paddock with animals in it" });
//     }

//     await prisma.paddock.delete({
//       where: { id: paddockId },
//     });

//     // Update farm paddock count
//     await prisma.farm.update({
//       where: { id: farmId },
//       data: { paddockCount: { decrement: 1 } },
//     });

//     // Log activity
//     await prisma.activityLog.create({
//       data: {
//         userId: currentUserId,
//         farmId,
//         action: "DELETE_PADDOCK",
//         module: "PADDOCKS",
//         entityType: "Paddock",
//         entityId: paddockId,
//         description: `Deleted paddock: ${paddock.name}`,
//       },
//     });

//     res.json({ message: "Paddock deleted successfully" });
//   } catch (error: any) {
//     console.error("Delete paddock error:", error);
//     res.status(500).json({ error: "Failed to delete paddock" });
//   }
// };

// // ==================== MOVE ANIMALS TO PADDOCK ====================
// export const moveAnimalsToPaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId, paddockId } = req.params;
//     const { animalIds, startGrazing } = req.body;
//     const currentUserId = req.user?.id;

//     // Verify permission
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     const currentMember = farm.members[0];
//     const hasPermission =
//       farm.ownerId === currentUserId ||
//       currentMember?.role === "MANAGER" ||
//       currentMember?.role === "CARETAKER" ||
//       currentMember?.permissions.includes("manage_paddocks");

//     if (!hasPermission) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to move animals" });
//     }

//     const paddock = await prisma.paddock.findUnique({
//       where: { id: paddockId },
//     });

//     if (!paddock || paddock.farmId !== farmId) {
//       return res.status(404).json({ error: "Paddock not found" });
//     }

//     if (paddock.status === "MAINTENANCE") {
//       return res
//         .status(400)
//         .json({ error: "Cannot move animals to paddock under maintenance" });
//     }

//     // Verify all animals belong to this farm
//     const animals = await prisma.animal.findMany({
//       where: {
//         id: { in: animalIds },
//         farmId,
//       },
//     });

//     if (animals.length !== animalIds.length) {
//       return res.status(400).json({ error: "Some animals not found or don't belong to this farm" });
//     }

//     // Update paddock
//     const updatedPaddock = await prisma.paddock.update({
//       where: { id: paddockId },
//       data: {
//         isOccupied: true,
//         currentAnimalIds: animalIds,
//         status: "IN_USE",
//         lastGrazedDate: startGrazing ? new Date() : paddock.lastGrazedDate,
//       },
//     });

//     // Update animals' current paddock
//     await prisma.animal.updateMany({
//       where: {
//         id: { in: animalIds },
//       },
//       data: {
//         currentPaddock: paddockId,
//         currentLocation: `Paddock: ${paddock.name}`,
//       },
//     });

//     // Create grazing history if starting grazing
//     if (startGrazing) {
//       await prisma.grazingHistory.create({
//         data: {
//           paddockId,
//           animalIds,
//           startDate: new Date(),
//           grassConditionBefore: paddock.soilCondition,
//         },
//       });
//     }

//     // Log activity
//     await prisma.activityLog.create({
//       data: {
//         userId: currentUserId,
//         farmId,
//         action: "MOVE_ANIMALS_TO_PADDOCK",
//         module: "PADDOCKS",
//         entityType: "Paddock",
//         entityId: paddockId,
//         description: `Moved ${animalIds.length} animals to ${paddock.name}`,
//         metadata: { animalIds, startGrazing },
//       },
//     });

//     res.json({
//       message: "Animals moved to paddock successfully",
//       data: updatedPaddock,
//     });
//   } catch (error: any) {
//     console.error("Move animals to paddock error:", error);
//     res.status(500).json({ error: "Failed to move animals to paddock" });
//   }
// };

// // ==================== REMOVE ANIMALS FROM PADDOCK ====================
// export const removeAnimalsFromPaddock = async (req: Request, res: Response) => {
//   try {
//     const { farmId, paddockId } = req.params;
//     const { animalIds, endGrazing, grassConditionAfter } = req.body;
//     const currentUserId = req.user?.id;

//     // Verify permission
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     const currentMember = farm.members[0];
//     const hasPermission =
//       farm.ownerId === currentUserId ||
//       currentMember?.role === "MANAGER" ||
//       currentMember?.role === "CARETAKER" ||
//       currentMember?.permissions.includes("manage_paddocks");

//     if (!hasPermission) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to remove animals" });
//     }

//     const paddock = await prisma.paddock.findUnique({
//       where: { id: paddockId },
//     });

//     if (!paddock || paddock.farmId !== farmId) {
//       return res.status(404).json({ error: "Paddock not found" });
//     }

//     // Remove specified animals from paddock
//     const remainingAnimals = paddock.currentAnimalIds.filter(
//       (id) => !animalIds.includes(id)
//     );

//     const updatedPaddock = await prisma.paddock.update({
//       where: { id: paddockId },
//       data: {
//         currentAnimalIds: remainingAnimals,
//         isOccupied: remainingAnimals.length > 0,
//         status: remainingAnimals.length > 0 ? "IN_USE" : "RESTING",
//         nextGrazingDate:
//           remainingAnimals.length === 0
//             ? new Date(Date.now() + (paddock.recommendedRest || 21) * 24 * 60 * 60 * 1000)
//             : null,
//       },
//     });

//     // Update animals
//     await prisma.animal.updateMany({
//       where: {
//         id: { in: animalIds },
//       },
//       data: {
//         currentPaddock: null,
//         currentLocation: "Barn/Shelter",
//       },
//     });

//     // Update grazing history if ending grazing
//     if (endGrazing) {
//       const activeHistory = await prisma.grazingHistory.findFirst({
//         where: {
//           paddockId,
//           endDate: null,
//         },
//         orderBy: { startDate: "desc" },
//       });

//       if (activeHistory) {
//         const startDate = new Date(activeHistory.startDate);
//         const endDate = new Date();
//         const durationDays = Math.floor(
//           (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
//         );

//         await prisma.grazingHistory.update({
//           where: { id: activeHistory.id },
//           data: {
//             endDate,
//             durationDays,
//             grassConditionAfter: grassConditionAfter || paddock.soilCondition,
//           },
//         });
//       }
//     }

//     // Log activity
//     await prisma.activityLog.create({
//       data: {
//         userId: currentUserId,
//         farmId,
//         action: "REMOVE_ANIMALS_FROM_PADDOCK",
//         module: "PADDOCKS",
//         entityType: "Paddock",
//         entityId: paddockId,
//         description: `Removed ${animalIds.length} animals from ${paddock.name}`,
//         metadata: { animalIds, endGrazing },
//       },
//     });

//     res.json({
//       message: "Animals removed from paddock successfully",
//       data: updatedPaddock,
//     });
//   } catch (error: any) {
//     console.error("Remove animals from paddock error:", error);
//     res.status(500).json({ error: "Failed to remove animals from paddock" });
//   }
// };

// // ==================== GET PADDOCK STATS ====================
// export const getPaddockStats = async (req: Request, res: Response) => {
//   try {
//     const { farmId } = req.params;
//     const currentUserId = req.user?.id;

//     // Verify access
//     const farm = await prisma.farm.findUnique({
//       where: { id: farmId },
//       include: {
//         members: {
//           where: { userId: currentUserId },
//         },
//       },
//     });

//     if (!farm) {
//       return res.status(404).json({ error: "Farm not found" });
//     }

//     if (farm.ownerId !== currentUserId && !farm.members.length) {
//       return res.status(403).json({ error: "Access denied" });
//     }

//     const totalPaddocks = await prisma.paddock.count({
//       where: { farmId },
//     });

//     const occupiedPaddocks = await prisma.paddock.count({
//       where: { farmId, isOccupied: true },
//     });

//     const availablePaddocks = await prisma.paddock.count({
//       where: { farmId, status: "AVAILABLE" },
//     });

//     const restingPaddocks = await prisma.paddock.count({
//       where: { farmId, status: "RESTING" },
//     });

//     const maintenancePaddocks = await prisma.paddock.count({
//       where: { farmId, status: "MAINTENANCE" },
//     });

//     const paddocksWithWater = await prisma.paddock.count({
//       where: { farmId, hasWaterSource: true },
//     });

//     const totalAcreage = await prisma.paddock.aggregate({
//       where: { farmId },
//       _sum: { sizeInAcres: true },
//     });

//     res.json({
//       data: {
//         totalPaddocks,
//         occupiedPaddocks,
//         availablePaddocks,
//         restingPaddocks,
//         maintenancePaddocks,
//         paddocksWithWater,
//         totalAcreage: totalAcreage._sum.sizeInAcres || 0,
//       },
//     });
//   } catch (error: any) {
//     console.error("Get paddock stats error:", error);
//     res.status(500).json({ error: "Failed to fetch paddock stats" });
//   }
// };






// controllers/paddocks.ts (or controllers/paddockController.ts)
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== CREATE PADDOCK ====================
export const createPaddock = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const {
      name,
      number,
      sizeInAcres,
      grassType,
      grassHeight,
      soilCondition,
      lastSoilTest,
      isOccupied,
      currentAnimalIds,
      lastGrazedDate,
      nextGrazingDate,
      recommendedRest,
      hasWaterSource,
      hasShelter,
      hasSaltLick,
      hasMineralLick,
      lastMaintenance,
      maintenanceNotes,
      status,
    } = req.body;
    const currentUserId = req.user?.id; // Changed from userId to id

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify farm exists and user has permission
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const currentMember = farm.members[0];
    const hasPermission =
      farm.ownerId === currentUserId ||
      currentMember?.role === "MANAGER" ||
      currentMember?.permissions.includes("manage_paddocks");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to create paddocks" });
    }

    const paddock = await prisma.paddock.create({
      data: {
        farmId,
        name,
        number,
        sizeInAcres,
        grassType,
        grassHeight,
        soilCondition,
        lastSoilTest: lastSoilTest ? new Date(lastSoilTest) : undefined,
        isOccupied: isOccupied || false,
        currentAnimalIds: currentAnimalIds || [],
        lastGrazedDate: lastGrazedDate ? new Date(lastGrazedDate) : undefined,
        nextGrazingDate: nextGrazingDate ? new Date(nextGrazingDate) : undefined,
        recommendedRest: recommendedRest || 21,
        hasWaterSource: hasWaterSource || false,
        hasShelter: hasShelter || false,
        hasSaltLick: hasSaltLick || false,
        hasMineralLick: hasMineralLick || false,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : undefined,
        maintenanceNotes,
        status: status || "AVAILABLE",
      },
    });

    // Update farm paddock count
    await prisma.farm.update({
      where: { id: farmId },
      data: { paddockCount: { increment: 1 } },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "CREATE_PADDOCK",
        module: "PADDOCKS",
        entityType: "Paddock",
        entityId: paddock.id,
        description: `Created paddock: ${name}`,
      },
    });

    res.status(201).json({
      message: "Paddock created successfully",
      data: paddock,
    });
  } catch (error: any) {
    console.error("Create paddock error:", error);
    res.status(500).json({ error: "Failed to create paddock" });
  }
};

// ==================== GET ALL PADDOCKS ====================
export const getPaddocks = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const { status, isOccupied, hasWaterSource } = req.query;
    const currentUserId = req.user?.id; // Changed from userId to id

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify access
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    // Check if user is owner or member
    const isOwner = farm.ownerId === currentUserId;
    const isMember = farm.members.length > 0;

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const where: any = { farmId };
    if (status) where.status = status;
    if (isOccupied !== undefined) where.isOccupied = isOccupied === "true";
    if (hasWaterSource !== undefined)
      where.hasWaterSource = hasWaterSource === "true";

    const paddocks = await prisma.paddock.findMany({
      where,
      include: {
        grazingHistory: {
          take: 5,
          orderBy: { startDate: "desc" },
        },
        pastureSoilTests: {
          take: 1,
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.paddock.count({ where });

    res.json({
      data: {
        paddocks,
        total,
      },
    });
  } catch (error: any) {
    console.error("Get paddocks error:", error);
    res.status(500).json({ error: "Failed to fetch paddocks" });
  }
};

// ==================== GET PADDOCK STATS ====================
export const getPaddockStats = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const currentUserId = req.user?.id; // Changed from userId to id

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify access
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    // Check if user is owner or member
    const isOwner = farm.ownerId === currentUserId;
    const isMember = farm.members.length > 0;

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const totalPaddocks = await prisma.paddock.count({
      where: { farmId },
    });

    const occupiedPaddocks = await prisma.paddock.count({
      where: { farmId, isOccupied: true },
    });

    const availablePaddocks = await prisma.paddock.count({
      where: { farmId, status: "AVAILABLE" },
    });

    const restingPaddocks = await prisma.paddock.count({
      where: { farmId, status: "RESTING" },
    });

    const maintenancePaddocks = await prisma.paddock.count({
      where: { farmId, status: "MAINTENANCE" },
    });

    const paddocksWithWater = await prisma.paddock.count({
      where: { farmId, hasWaterSource: true },
    });

    const totalAcreage = await prisma.paddock.aggregate({
      where: { farmId },
      _sum: { sizeInAcres: true },
    });

    res.json({
      data: {
        totalPaddocks,
        occupiedPaddocks,
        availablePaddocks,
        restingPaddocks,
        maintenancePaddocks,
        paddocksWithWater,
        totalAcreage: totalAcreage._sum.sizeInAcres || 0,
      },
    });
  } catch (error: any) {
    console.error("Get paddock stats error:", error);
    res.status(500).json({ error: "Failed to fetch paddock stats" });
  }
};


export const getPaddock = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify access
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const isOwner = farm.ownerId === currentUserId;
    const isMember = farm.members.length > 0;

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
      include: {
        grazingHistory: {
          orderBy: { startDate: "desc" },
        },
        pastureSoilTests: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    // Get animals currently in paddock
    const animals = await prisma.animal.findMany({
      where: {
        id: { in: paddock.currentAnimalIds },
      },
      select: {
        id: true,
        tagNumber: true,
        name: true,
        category: true,
        breed: true,
        currentWeight: true,
      },
    });

    res.json({
      data: {
        ...paddock,
        currentAnimals: animals,
      },
    });
  } catch (error: any) {
    console.error("Get paddock error:", error);
    res.status(500).json({ error: "Failed to fetch paddock" });
  }
};

// ==================== UPDATE PADDOCK ====================
export const updatePaddock = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const updateData = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify permission
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const currentMember = farm.members[0];
    const hasPermission =
      farm.ownerId === currentUserId ||
      currentMember?.role === "MANAGER" ||
      currentMember?.permissions.includes("manage_paddocks");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to update paddocks" });
    }

    // Process date fields
    const processedData: any = { ...updateData };
    if (updateData.lastSoilTest) {
      processedData.lastSoilTest = new Date(updateData.lastSoilTest);
    }
    if (updateData.lastGrazedDate) {
      processedData.lastGrazedDate = new Date(updateData.lastGrazedDate);
    }
    if (updateData.nextGrazingDate) {
      processedData.nextGrazingDate = new Date(updateData.nextGrazingDate);
    }
    if (updateData.lastMaintenance) {
      processedData.lastMaintenance = new Date(updateData.lastMaintenance);
    }

    const paddock = await prisma.paddock.update({
      where: { id: paddockId },
      data: processedData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "UPDATE_PADDOCK",
        module: "PADDOCKS",
        entityType: "Paddock",
        entityId: paddockId,
        description: `Updated paddock: ${paddock.name}`,
        metadata: updateData,
      },
    });

    res.json({
      message: "Paddock updated successfully",
      data: paddock,
    });
  } catch (error: any) {
    console.error("Update paddock error:", error);
    res.status(500).json({ error: "Failed to update paddock" });
  }
};

// ==================== DELETE PADDOCK ====================
export const deletePaddock = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify permission
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const currentMember = farm.members[0];
    const hasPermission =
      farm.ownerId === currentUserId || currentMember?.role === "MANAGER";

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Only farm owner or manager can delete paddocks" });
    }

    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    if (paddock.isOccupied) {
      return res
        .status(400)
        .json({ error: "Cannot delete paddock with animals in it" });
    }

    await prisma.paddock.delete({
      where: { id: paddockId },
    });

    // Update farm paddock count
    await prisma.farm.update({
      where: { id: farmId },
      data: { paddockCount: { decrement: 1 } },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "DELETE_PADDOCK",
        module: "PADDOCKS",
        entityType: "Paddock",
        entityId: paddockId,
        description: `Deleted paddock: ${paddock.name}`,
      },
    });

    res.json({ message: "Paddock deleted successfully" });
  } catch (error: any) {
    console.error("Delete paddock error:", error);
    res.status(500).json({ error: "Failed to delete paddock" });
  }
};

// ==================== MOVE ANIMALS TO PADDOCK ====================
export const moveAnimalsToPaddock = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const { animalIds, startGrazing } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify permission
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const currentMember = farm.members[0];
    const hasPermission =
      farm.ownerId === currentUserId ||
      currentMember?.role === "MANAGER" ||
      currentMember?.role === "CARETAKER" ||
      currentMember?.permissions.includes("manage_paddocks");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to move animals" });
    }

    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    if (paddock.status === "MAINTENANCE") {
      return res
        .status(400)
        .json({ error: "Cannot move animals to paddock under maintenance" });
    }

    // Verify all animals belong to this farm
    const animals = await prisma.animal.findMany({
      where: {
        id: { in: animalIds },
        farmId,
      },
    });

    if (animals.length !== animalIds.length) {
      return res.status(400).json({ error: "Some animals not found or don't belong to this farm" });
    }

    // Update paddock
    const updatedPaddock = await prisma.paddock.update({
      where: { id: paddockId },
      data: {
        isOccupied: true,
        currentAnimalIds: animalIds,
        status: "IN_USE",
        lastGrazedDate: startGrazing ? new Date() : paddock.lastGrazedDate,
      },
    });

    // Update animals' current paddock
    await prisma.animal.updateMany({
      where: {
        id: { in: animalIds },
      },
      data: {
        currentPaddock: paddockId,
        currentLocation: `Paddock: ${paddock.name}`,
      },
    });

    // Create grazing history if starting grazing
    if (startGrazing) {
      await prisma.grazingHistory.create({
        data: {
          paddockId,
          animalIds,
          startDate: new Date(),
          grassConditionBefore: paddock.soilCondition,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "MOVE_ANIMALS_TO_PADDOCK",
        module: "PADDOCKS",
        entityType: "Paddock",
        entityId: paddockId,
        description: `Moved ${animalIds.length} animals to ${paddock.name}`,
        metadata: { animalIds, startGrazing },
      },
    });

    res.json({
      message: "Animals moved to paddock successfully",
      data: updatedPaddock,
    });
  } catch (error: any) {
    console.error("Move animals to paddock error:", error);
    res.status(500).json({ error: "Failed to move animals to paddock" });
  }
};

// ==================== REMOVE ANIMALS FROM PADDOCK ====================
export const removeAnimalsFromPaddock = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const { animalIds, endGrazing, grassConditionAfter } = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify permission
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        members: {
          where: { userId: currentUserId },
        },
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    const currentMember = farm.members[0];
    const hasPermission =
      farm.ownerId === currentUserId ||
      currentMember?.role === "MANAGER" ||
      currentMember?.role === "CARETAKER" ||
      currentMember?.permissions.includes("manage_paddocks");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to remove animals" });
    }

    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    // Remove specified animals from paddock
    const remainingAnimals = paddock.currentAnimalIds.filter(
      (id) => !animalIds.includes(id)
    );

    const updatedPaddock = await prisma.paddock.update({
      where: { id: paddockId },
      data: {
        currentAnimalIds: remainingAnimals,
        isOccupied: remainingAnimals.length > 0,
        status: remainingAnimals.length > 0 ? "IN_USE" : "RESTING",
        nextGrazingDate:
          remainingAnimals.length === 0
            ? new Date(Date.now() + (paddock.recommendedRest || 21) * 24 * 60 * 60 * 1000)
            : paddock.nextGrazingDate,
      },
    });

    // Update animals
    await prisma.animal.updateMany({
      where: {
        id: { in: animalIds },
      },
      data: {
        currentPaddock: null,
        currentLocation: "Barn/Shelter",
      },
    });

    // Update grazing history if ending grazing
    if (endGrazing) {
      const activeHistory = await prisma.grazingHistory.findFirst({
        where: {
          paddockId,
          endDate: null,
        },
        orderBy: { startDate: "desc" },
      });

      if (activeHistory) {
        const startDate = new Date(activeHistory.startDate);
        const endDate = new Date();
        const durationDays = Math.floor(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        await prisma.grazingHistory.update({
          where: { id: activeHistory.id },
          data: {
            endDate,
            durationDays,
            grassConditionAfter: grassConditionAfter || paddock.soilCondition,
          },
        });
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "REMOVE_ANIMALS_FROM_PADDOCK",
        module: "PADDOCKS",
        entityType: "Paddock",
        entityId: paddockId,
        description: `Removed ${animalIds.length} animals from ${paddock.name}`,
        metadata: { animalIds, endGrazing },
      },
    });

    res.json({
      message: "Animals removed from paddock successfully",
      data: updatedPaddock,
    });
  } catch (error: any) {
    console.error("Remove animals from paddock error:", error);
    res.status(500).json({ error: "Failed to remove animals from paddock" });
  }
};
