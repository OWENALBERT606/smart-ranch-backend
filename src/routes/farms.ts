import express from "express";
import {
  createFarm,
  getAllFarms,
  getFarmBySlug,
  updateFarm,
  deleteFarm,
  getFarmStats,
  inviteMember,
  removeMember,
} from "@/controllers/farms";
import { authenticateToken, superAdminMiddleware } from "@/lib/authMiddleware";

const router = express.Router();

// ==================== PROTECTED ROUTES ====================

// All farm routes require authentication
router.use(authenticateToken);

// Create farm (Farmers only - checked in controller)
router.post("/", createFarm);

// Get all farms (with filters and pagination)
router.get("/", getAllFarms);

// Get farm by slug
router.get("/:slug", getFarmBySlug);

// Update farm (Owner, Manager, or Super Admin)
router.patch("/:slug", updateFarm);

// Delete farm (Owner or Super Admin only)
router.delete("/:slug", deleteFarm);

// Get farm statistics
router.get("/:slug/stats", getFarmStats);

// ==================== FARM MEMBER MANAGEMENT ====================

// Invite member to farm
router.post("/:slug/members/invite", inviteMember);

// Remove member from farm
router.delete("/:slug/members/:memberId", removeMember);

// ==================== SUPER ADMIN ROUTES ====================

// Suspend farm (Super Admin only)
router.post(
  "/:slug/suspend",
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).user?.userId;

      const farm = await (await import("@/db/db")).db.farm.update({
        where: { slug },
        data: { status: "SUSPENDED" as any },
      });

      await (await import("@/db/db")).db.notification.create({
        data: {
          userId: farm.ownerId,
          type: "SYSTEM_UPDATE" as any,
          title: "Farm Suspended",
          message: `Your farm ${farm.name} has been suspended. ${reason || ""}`,
          farmId: farm.id,
          priority: "HIGH" as any,
        },
      });

      await (await import("@/db/db")).db.activityLog.create({
        data: {
          userId: adminId,
          farmId: farm.id,
          action: "FARM_SUSPENDED",
          module: "farms",
          entityType: "Farm",
          entityId: farm.id,
          status: "SUCCESS",
          description: `Farm suspended by admin. Reason: ${reason || "Not specified"}`,
        },
      });

      res.status(200).json({
        success: true,
        message: "Farm suspended successfully",
      });
    } catch (error) {
      console.error("Suspend farm error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to suspend farm",
      });
    }
  }
);

// Reactivate farm (Super Admin only)
router.post(
  "/:slug/reactivate",
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const adminId = (req as any).user?.userId;

      const farm = await (await import("@/db/db")).db.farm.update({
        where: { slug },
        data: { 
          status: "ACTIVE" as any,
          isActive: true,
        },
      });

      await (await import("@/db/db")).db.notification.create({
        data: {
          userId: farm.ownerId,
          type: "SYSTEM_UPDATE" as any,
          title: "Farm Reactivated",
          message: `Your farm ${farm.name} has been reactivated.`,
          farmId: farm.id,
          priority: "NORMAL" as any,
        },
      });

      await (await import("@/db/db")).db.activityLog.create({
        data: {
          userId: adminId,
          farmId: farm.id,
          action: "FARM_REACTIVATED",
          module: "farms",
          entityType: "Farm",
          entityId: farm.id,
          status: "SUCCESS",
          description: "Farm reactivated by admin",
        },
      });

      res.status(200).json({
        success: true,
        message: "Farm reactivated successfully",
      });
    } catch (error) {
      console.error("Reactivate farm error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reactivate farm",
      });
    }
  }
);

export default router;