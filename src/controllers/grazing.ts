import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== CREATE GRAZING HISTORY ====================
export const createGrazingHistory = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const {
      animalIds,
      startDate,
      endDate,
      durationDays,
      grassConditionBefore,
      grassConditionAfter,
      notes,
    } = req.body;
    const currentUserId = req.user?.id;

    // Verify farm access
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
      currentMember?.permissions.includes("add_grazing_records");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to add grazing history" });
    }

    // Verify paddock exists and belongs to farm
    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    // Calculate duration if both dates provided but duration not
    let calculatedDuration = durationDays;
    if (startDate && endDate && !durationDays) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      calculatedDuration = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const grazingHistory = await prisma.grazingHistory.create({
      data: {
        paddockId,
        animalIds: animalIds || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        durationDays: calculatedDuration,
        grassConditionBefore,
        grassConditionAfter,
        notes,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "CREATE_GRAZING_HISTORY",
        module: "PADDOCKS",
        entityType: "GrazingHistory",
        entityId: grazingHistory.id,
        description: `Added grazing history for ${paddock.name}`,
      },
    });

    res.status(201).json({
      message: "Grazing history created successfully",
      data: grazingHistory,
    });
  } catch (error: any) {
    console.error("Create grazing history error:", error);
    res.status(500).json({ error: "Failed to create grazing history" });
  }
};

// ==================== GET GRAZING HISTORY ====================
export const getGrazingHistory = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const { startDate, endDate, limit } = req.query;
    const currentUserId = req.user?.id;

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

    if (farm.ownerId !== currentUserId && !farm.members.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify paddock
    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    const where: any = { paddockId };

    // Date range filter
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate as string);
      if (endDate) where.startDate.lte = new Date(endDate as string);
    }

    const grazingHistory = await prisma.grazingHistory.findMany({
      where,
      orderBy: { startDate: "desc" },
      take: limit ? parseInt(limit as string) : undefined,
    });

    // Get animal details for each history entry
    const historyWithAnimals = await Promise.all(
      grazingHistory.map(async (history) => {
        const animals = await prisma.animal.findMany({
          where: {
            id: { in: history.animalIds },
          },
          select: {
            id: true,
            tagNumber: true,
            name: true,
            category: true,
            breed: true,
          },
        });

        return {
          ...history,
          animals,
        };
      })
    );

    const total = await prisma.grazingHistory.count({ where });

    res.json({
      data: {
        history: historyWithAnimals,
        total,
      },
    });
  } catch (error: any) {
    console.error("Get grazing history error:", error);
    res.status(500).json({ error: "Failed to fetch grazing history" });
  }
};

// ==================== GET SINGLE GRAZING HISTORY ====================
export const getSingleGrazingHistory = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, historyId } = req.params;
    const currentUserId = req.user?.id;

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

    if (farm.ownerId !== currentUserId && !farm.members.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const history = await prisma.grazingHistory.findUnique({
      where: { id: historyId },
      include: {
        paddock: {
          select: {
            id: true,
            name: true,
            number: true,
            sizeInAcres: true,
          },
        },
      },
    });

    if (!history || history.paddockId !== paddockId) {
      return res.status(404).json({ error: "Grazing history not found" });
    }

    // Get animal details
    const animals = await prisma.animal.findMany({
      where: {
        id: { in: history.animalIds },
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
        ...history,
        animals,
      },
    });
  } catch (error: any) {
    console.error("Get single grazing history error:", error);
    res.status(500).json({ error: "Failed to fetch grazing history" });
  }
};

// ==================== UPDATE GRAZING HISTORY ====================
export const updateGrazingHistory = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, historyId } = req.params;
    const updateData = req.body;
    const currentUserId = req.user?.id;

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
      currentMember?.permissions.includes("update_grazing_records");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to update grazing history" });
    }

    // Process date fields
    const processedData: any = { ...updateData };
    if (updateData.startDate) {
      processedData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      processedData.endDate = new Date(updateData.endDate);
    }

    // Recalculate duration if dates changed
    if (processedData.startDate && processedData.endDate && !updateData.durationDays) {
      processedData.durationDays = Math.floor(
        (processedData.endDate.getTime() - processedData.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }

    const history = await prisma.grazingHistory.update({
      where: { id: historyId },
      data: processedData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "UPDATE_GRAZING_HISTORY",
        module: "PADDOCKS",
        entityType: "GrazingHistory",
        entityId: historyId,
        description: `Updated grazing history`,
        metadata: updateData,
      },
    });

    res.json({
      message: "Grazing history updated successfully",
      data: history,
    });
  } catch (error: any) {
    console.error("Update grazing history error:", error);
    res.status(500).json({ error: "Failed to update grazing history" });
  }
};

// ==================== DELETE GRAZING HISTORY ====================
export const deleteGrazingHistory = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, historyId } = req.params;
    const currentUserId = req.user?.id;

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
        .json({ error: "Only farm owner or manager can delete grazing history" });
    }

    await prisma.grazingHistory.delete({
      where: { id: historyId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "DELETE_GRAZING_HISTORY",
        module: "PADDOCKS",
        entityType: "GrazingHistory",
        entityId: historyId,
        description: `Deleted grazing history`,
      },
    });

    res.json({ message: "Grazing history deleted successfully" });
  } catch (error: any) {
    console.error("Delete grazing history error:", error);
    res.status(500).json({ error: "Failed to delete grazing history" });
  }
};

// ==================== END ACTIVE GRAZING ====================
export const endActiveGrazing = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const { grassConditionAfter, notes } = req.body;
    const currentUserId = req.user?.id;

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
      currentMember?.role === "CARETAKER";

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to end grazing" });
    }

    // Find active grazing history
    const activeHistory = await prisma.grazingHistory.findFirst({
      where: {
        paddockId,
        endDate: null,
      },
      orderBy: { startDate: "desc" },
    });

    if (!activeHistory) {
      return res.status(404).json({ error: "No active grazing found for this paddock" });
    }

    const endDate = new Date();
    const durationDays = Math.floor(
      (endDate.getTime() - new Date(activeHistory.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const updatedHistory = await prisma.grazingHistory.update({
      where: { id: activeHistory.id },
      data: {
        endDate,
        durationDays,
        grassConditionAfter,
        notes: notes || activeHistory.notes,
      },
    });

    // Update paddock status
    await prisma.paddock.update({
      where: { id: paddockId },
      data: {
        status: "RESTING",
        isOccupied: false,
        currentAnimalIds: [],
        nextGrazingDate: new Date(
          Date.now() +
            21 * 24 * 60 * 60 * 1000 // Default 21 days rest
        ),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "END_GRAZING",
        module: "PADDOCKS",
        entityType: "GrazingHistory",
        entityId: activeHistory.id,
        description: `Ended grazing session (${durationDays} days)`,
      },
    });

    res.json({
      message: "Grazing session ended successfully",
      data: updatedHistory,
    });
  } catch (error: any) {
    console.error("End active grazing error:", error);
    res.status(500).json({ error: "Failed to end grazing session" });
  }
};

// ==================== GET GRAZING ANALYTICS ====================
export const getGrazingAnalytics = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const currentUserId = req.user?.id;

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

    if (farm.ownerId !== currentUserId && !farm.members.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allHistory = await prisma.grazingHistory.findMany({
      where: { paddockId },
    });

    const completedSessions = allHistory.filter((h) => h.endDate !== null);

    const totalSessions = allHistory.length;
    const completedCount = completedSessions.length;
    const activeSessions = totalSessions - completedCount;

    const avgDuration =
      completedCount > 0
        ? completedSessions.reduce(
            (sum, h) => sum + (h.durationDays || 0),
            0
          ) / completedCount
        : 0;

    const totalGrazingDays = completedSessions.reduce(
      (sum, h) => sum + (h.durationDays || 0),
      0
    );

    const uniqueAnimalsGrazed = new Set(
      allHistory.flatMap((h) => h.animalIds)
    ).size;

    res.json({
      data: {
        totalSessions,
        completedSessions: completedCount,
        activeSessions,
        averageDurationDays: Math.round(avgDuration * 10) / 10,
        totalGrazingDays,
        uniqueAnimalsGrazed,
      },
    });
  } catch (error: any) {
    console.error("Get grazing analytics error:", error);
    res.status(500).json({ error: "Failed to fetch grazing analytics" });
  }
};