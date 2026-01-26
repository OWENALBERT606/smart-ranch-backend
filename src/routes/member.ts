import express from "express";
import {
  inviteFarmMember,
  acceptFarmInvitation,
  rejectFarmInvitation,
  getFarmMembers,
  updateFarmMember,
  removeFarmMember,
  leaveFarm,
} from "@/controllers/member";
import { authenticateToken } from "@/lib/authMiddleware";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== FARM MEMBER MANAGEMENT ====================

// Invite member to farm
router.post("/:farmId/members/invite", inviteFarmMember);

// Accept/Reject invitation
router.post("/:farmId/members/accept", acceptFarmInvitation);
router.post("/:farmId/members/reject", rejectFarmInvitation);

// Get all farm members
router.get("/:farmId/members", getFarmMembers);

// Update member role/permissions
router.patch("/:farmId/members/:memberId", updateFarmMember);

// Remove member from farm
router.delete("/:farmId/members/:memberId", removeFarmMember);

// Leave farm (self-remove)
router.post("/:farmId/members/leave", leaveFarm);

export default router;