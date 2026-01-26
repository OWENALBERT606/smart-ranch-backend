import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== CREATE SOIL TEST ====================
export const createSoilTest = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId } = req.params;
    const {
      date,
      pH,
      organicMatter,
      nitrogen,
      phosphorus,
      potassium,
      calcium,
      magnesium,
      sandPercentage,
      siltPercentage,
      clayPercentage,
      limeRequired,
      fertilizerNeeded,
      grassYield,
      grassHeight,
      botanicalComposition,
      testedBy,
      laboratoryName,
      testCost,
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
      currentMember?.permissions.includes("add_soil_tests");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to add soil tests" });
    }

    // Verify paddock
    const paddock = await prisma.paddock.findUnique({
      where: { id: paddockId },
    });

    if (!paddock || paddock.farmId !== farmId) {
      return res.status(404).json({ error: "Paddock not found" });
    }

    const soilTest = await prisma.pastureSoilTest.create({
      data: {
        paddockId,
        date: date ? new Date(date) : new Date(),
        pH,
        organicMatter,
        nitrogen,
        phosphorus,
        potassium,
        calcium,
        magnesium,
        sandPercentage,
        siltPercentage,
        clayPercentage,
        limeRequired,
        fertilizerNeeded,
        grassYield,
        grassHeight,
        botanicalComposition,
        testedBy,
        laboratoryName,
        testCost,
        notes,
      },
    });

    // Update paddock's lastSoilTest date
    await prisma.paddock.update({
      where: { id: paddockId },
      data: {
        lastSoilTest: soilTest.date,
        soilCondition: getSoilConditionFrompH(pH),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "CREATE_SOIL_TEST",
        module: "PADDOCKS",
        entityType: "PastureSoilTest",
        entityId: soilTest.id,
        description: `Added soil test for ${paddock.name}`,
      },
    });

    res.status(201).json({
      message: "Soil test created successfully",
      data: soilTest,
    });
  } catch (error: any) {
    console.error("Create soil test error:", error);
    res.status(500).json({ error: "Failed to create soil test" });
  }
};

// ==================== GET SOIL TESTS ====================
export const getSoilTests = async (req: Request, res: Response) => {
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
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const soilTests = await prisma.pastureSoilTest.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit as string) : undefined,
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

    const total = await prisma.pastureSoilTest.count({ where });

    res.json({
      data: {
        tests: soilTests,
        total,
      },
    });
  } catch (error: any) {
    console.error("Get soil tests error:", error);
    res.status(500).json({ error: "Failed to fetch soil tests" });
  }
};

// ==================== GET SINGLE SOIL TEST ====================
export const getSingleSoilTest = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, testId } = req.params;
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

    const soilTest = await prisma.pastureSoilTest.findUnique({
      where: { id: testId },
      include: {
        paddock: {
          select: {
            id: true,
            name: true,
            number: true,
            sizeInAcres: true,
            grassType: true,
          },
        },
      },
    });

    if (!soilTest || soilTest.paddockId !== paddockId) {
      return res.status(404).json({ error: "Soil test not found" });
    }

    // Get recommendations based on test results
    const recommendations = generateRecommendations(soilTest);

    res.json({
      data: {
        ...soilTest,
        recommendations,
      },
    });
  } catch (error: any) {
    console.error("Get single soil test error:", error);
    res.status(500).json({ error: "Failed to fetch soil test" });
  }
};

// ==================== UPDATE SOIL TEST ====================
export const updateSoilTest = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, testId } = req.params;
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
      currentMember?.permissions.includes("update_soil_tests");

    if (!hasPermission) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to update soil tests" });
    }

    // Process date field
    const processedData: any = { ...updateData };
    if (updateData.date) {
      processedData.date = new Date(updateData.date);
    }

    const soilTest = await prisma.pastureSoilTest.update({
      where: { id: testId },
      data: processedData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "UPDATE_SOIL_TEST",
        module: "PADDOCKS",
        entityType: "PastureSoilTest",
        entityId: testId,
        description: `Updated soil test`,
        metadata: updateData,
      },
    });

    res.json({
      message: "Soil test updated successfully",
      data: soilTest,
    });
  } catch (error: any) {
    console.error("Update soil test error:", error);
    res.status(500).json({ error: "Failed to update soil test" });
  }
};

// ==================== DELETE SOIL TEST ====================
export const deleteSoilTest = async (req: Request, res: Response) => {
  try {
    const { farmId, paddockId, testId } = req.params;
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
        .json({ error: "Only farm owner or manager can delete soil tests" });
    }

    await prisma.pastureSoilTest.delete({
      where: { id: testId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUserId,
        farmId,
        action: "DELETE_SOIL_TEST",
        module: "PADDOCKS",
        entityType: "PastureSoilTest",
        entityId: testId,
        description: `Deleted soil test`,
      },
    });

    res.json({ message: "Soil test deleted successfully" });
  } catch (error: any) {
    console.error("Delete soil test error:", error);
    res.status(500).json({ error: "Failed to delete soil test" });
  }
};

// ==================== GET SOIL TRENDS ====================
export const getSoilTrends = async (req: Request, res: Response) => {
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

    const soilTests = await prisma.pastureSoilTest.findMany({
      where: { paddockId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        pH: true,
        organicMatter: true,
        nitrogen: true,
        phosphorus: true,
        potassium: true,
        grassYield: true,
        grassHeight: true,
      },
    });

    if (soilTests.length < 2) {
      return res.json({
        data: {
          message: "Not enough data for trend analysis",
          tests: soilTests,
        },
      });
    }

    // Calculate trends
    const firstTest = soilTests[0];
    const latestTest = soilTests[soilTests.length - 1];

    const trends = {
      pH: {
        first: firstTest.pH,
        latest: latestTest.pH,
        change: latestTest.pH - firstTest.pH,
        trend: getTrend(firstTest.pH, latestTest.pH),
      },
      organicMatter: firstTest.organicMatter && latestTest.organicMatter ? {
        first: firstTest.organicMatter,
        latest: latestTest.organicMatter,
        change: latestTest.organicMatter - firstTest.organicMatter,
        trend: getTrend(firstTest.organicMatter, latestTest.organicMatter),
      } : null,
      nitrogen: firstTest.nitrogen && latestTest.nitrogen ? {
        first: firstTest.nitrogen,
        latest: latestTest.nitrogen,
        change: latestTest.nitrogen - firstTest.nitrogen,
        trend: getTrend(firstTest.nitrogen, latestTest.nitrogen),
      } : null,
      phosphorus: firstTest.phosphorus && latestTest.phosphorus ? {
        first: firstTest.phosphorus,
        latest: latestTest.phosphorus,
        change: latestTest.phosphorus - firstTest.phosphorus,
        trend: getTrend(firstTest.phosphorus, latestTest.phosphorus),
      } : null,
      potassium: firstTest.potassium && latestTest.potassium ? {
        first: firstTest.potassium,
        latest: latestTest.potassium,
        change: latestTest.potassium - firstTest.potassium,
        trend: getTrend(firstTest.potassium, latestTest.potassium),
      } : null,
    };

    res.json({
      data: {
        trends,
        totalTests: soilTests.length,
        dateRange: {
          from: firstTest.date,
          to: latestTest.date,
        },
        allTests: soilTests,
      },
    });
  } catch (error: any) {
    console.error("Get soil trends error:", error);
    res.status(500).json({ error: "Failed to fetch soil trends" });
  }
};

// ==================== COMPARE PADDOCK SOILS ====================
export const comparePaddockSoils = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
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

    // Get all paddocks with their latest soil test
    const paddocks = await prisma.paddock.findMany({
      where: { farmId },
      include: {
        pastureSoilTests: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    });

    const comparison = paddocks
      .filter((p) => p.pastureSoilTests.length > 0)
      .map((paddock) => {
        const latestTest = paddock.pastureSoilTests[0];
        return {
          paddockId: paddock.id,
          paddockName: paddock.name,
          paddockNumber: paddock.number,
          sizeInAcres: paddock.sizeInAcres,
          lastTestDate: latestTest.date,
          pH: latestTest.pH,
          organicMatter: latestTest.organicMatter,
          nitrogen: latestTest.nitrogen,
          phosphorus: latestTest.phosphorus,
          potassium: latestTest.potassium,
          grassYield: latestTest.grassYield,
          soilHealth: calculateSoilHealthScore(latestTest),
        };
      });

    // Sort by soil health score
    comparison.sort((a, b) => b.soilHealth - a.soilHealth);

    res.json({
      data: {
        comparison,
        totalPaddocksWithTests: comparison.length,
        totalPaddocks: paddocks.length,
      },
    });
  } catch (error: any) {
    console.error("Compare paddock soils error:", error);
    res.status(500).json({ error: "Failed to compare paddock soils" });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getSoilConditionFrompH(pH: number): string {
  if (pH < 5.5) return "Acidic";
  if (pH >= 5.5 && pH <= 7.0) return "Good";
  if (pH > 7.0 && pH <= 7.5) return "Slightly Alkaline";
  return "Alkaline";
}

function getTrend(first: number, latest: number): string {
  const change = latest - first;
  const percentChange = (change / first) * 100;

  if (Math.abs(percentChange) < 5) return "Stable";
  if (percentChange > 0) return "Increasing";
  return "Decreasing";
}

function calculateSoilHealthScore(test: any): number {
  let score = 0;
  let factors = 0;

  // pH score (optimal 6.0-7.0)
  if (test.pH >= 6.0 && test.pH <= 7.0) {
    score += 25;
  } else if (test.pH >= 5.5 && test.pH <= 7.5) {
    score += 15;
  } else {
    score += 5;
  }
  factors++;

  // Organic matter score (optimal > 3%)
  if (test.organicMatter) {
    if (test.organicMatter >= 3) {
      score += 25;
    } else if (test.organicMatter >= 2) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;
  }

  // Nitrogen score
  if (test.nitrogen) {
    if (test.nitrogen >= 20) {
      score += 25;
    } else if (test.nitrogen >= 10) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;
  }

  // Phosphorus score
  if (test.phosphorus) {
    if (test.phosphorus >= 15) {
      score += 25;
    } else if (test.phosphorus >= 8) {
      score += 15;
    } else {
      score += 5;
    }
    factors++;
  }

  return Math.round((score / (factors * 25)) * 100);
}

function generateRecommendations(test: any): string[] {
  const recommendations: string[] = [];

  // pH recommendations
  if (test.pH < 5.5) {
    recommendations.push(
      `Soil is too acidic (pH ${test.pH}). Apply lime to raise pH to 6.0-7.0 range.`
    );
    if (test.limeRequired) {
      recommendations.push(`Recommended lime application: ${test.limeRequired} kg/acre`);
    }
  } else if (test.pH > 7.5) {
    recommendations.push(
      `Soil is too alkaline (pH ${test.pH}). Consider sulfur application to lower pH.`
    );
  }

  // Organic matter
  if (test.organicMatter && test.organicMatter < 2) {
    recommendations.push(
      "Organic matter is low. Add compost or manure to improve soil structure and fertility."
    );
  }

  // Nitrogen
  if (test.nitrogen && test.nitrogen < 10) {
    recommendations.push(
      "Nitrogen levels are low. Consider nitrogen fertilizer or legume cover crops."
    );
  }

  // Phosphorus
  if (test.phosphorus && test.phosphorus < 8) {
    recommendations.push(
      "Phosphorus is deficient. Apply phosphate fertilizer for better root development."
    );
  }

  // Potassium
  if (test.potassium && test.potassium < 80) {
    recommendations.push(
      "Potassium levels are low. Apply potash fertilizer to improve disease resistance."
    );
  }

  // General recommendation if all good
  if (recommendations.length === 0) {
    recommendations.push(
      "Soil health is good. Maintain current management practices."
    );
  }

  return recommendations;
}