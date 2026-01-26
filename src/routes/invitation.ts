import express from "express";
import {
  getUserInvitations,
  getUserInvitationsCount,
} from "@/controllers/invitation";
import { authenticateToken } from "@/lib/authMiddleware";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== USER INVITATIONS ====================

// Get user's pending invitations
router.get("/invitations", getUserInvitations);

// Get count of pending invitations
router.get("/invitations/count", getUserInvitationsCount);

export default router;